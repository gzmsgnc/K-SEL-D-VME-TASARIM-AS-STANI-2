import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRawBodyEcliptic,
  resolveHistoricalUtcDateTime,
  AstrologicalBodyId,
} from '../astrologyCalculationEngine';
import { calculateClientTropicalChart } from '../astrologyEngineAdapter';
import { Client } from '../../../types/client';

describe('A24 — Astroloji Hesaplama Motoru Bağımsız Doğrulama Test Paketi', () => {
  // ---------------------------------------------------------------------------
  // 1. Doğum Verilerinin Doğrulanması (Tarih, Saat, UTC, DST, Koordinat)
  // ---------------------------------------------------------------------------
  describe('1. Doğum Verileri, Tarihsel UTC Dönüşümü ve Yaz Saati Kontrolü', () => {
    it('1.1. Türkiye standart kış saati (UTC+2) tarihsel olarak doğru çözümlenmelidir (1991-11-24)', () => {
      // Gizem Selma Genç doğum anı: 24 Kasım 1991, 03:15 yerel saat
      const res = resolveHistoricalUtcDateTime('1991-11-24', '03:15', 'Europe/Istanbul', 28.9497);
      assert.equal(res.exactUtcOffsetMinutes, 120, '1991 Kasım ayında Türkiye UTC+2 (120 dk) olmalıdır');
      assert.equal(res.exactUtcOffsetHours, 2);
      assert.equal(res.isDaylightSavingTime, false, 'Kasım ayında kış saati aktiftir (DST = false)');
      // Yerel 03:15 - 2 saat = 01:15 UTC
      assert.equal(res.utcIsoString, '1991-11-24T01:15:00.000Z');
      assert.ok(res.julianDate > 2448000, 'Julian Date geçerli aralıkta olmalıdır');
    });

    it('1.2. Türkiye yaz saati (UTC+3 / DST) tarihsel olarak doğru çözümlenmelidir (1991-07-15)', () => {
      // 15 Temmuz 1991, 14:00 yerel saat
      const res = resolveHistoricalUtcDateTime('1991-07-15', '14:00', 'Europe/Istanbul', 28.9497);
      assert.equal(res.exactUtcOffsetMinutes, 180, '1991 Temmuz ayında Türkiye UTC+3 (180 dk) olmalıdır');
      assert.equal(res.exactUtcOffsetHours, 3);
      assert.equal(res.isDaylightSavingTime, true, 'Temmuz ayında yaz saati aktiftir (DST = true)');
      // Yerel 14:00 - 3 saat = 11:00 UTC
      assert.equal(res.utcIsoString, '1991-07-15T11:00:00.000Z');
    });

    it('1.3. Bilinmeyen doğum saati 12:00 varsayımıyla işlenmeli ve açık uyarı bildirilmelidir', () => {
      const clientUnknownTime: Client = {
        id: 'client_unknown_time_a24',
        firstName: 'Test',
        lastName: 'BilinmeyenSaat',
        email: 'test.unknown@example.com',
        phone: '05550001122',
        birthDate: '1991-11-24',
        birthTime: '',
        isBirthTimeUnknown: true,
        birthLocation: {
          city: 'İstanbul',
          country: 'Türkiye',
          placeName: 'İstanbul, Fatih',
          latitude: 41.0182,
          longitude: 28.9497,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 120,
        },
        motherName: 'Songül',
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'OWNER_MANUAL',
        status: 'ACTIVE',
      };

      const res = calculateClientTropicalChart(clientUnknownTime);
      assert.equal(res.success, true);
      assert.equal(res.isNoonReference, true, 'Doğum saati bilinmediğinde isNoonReference true olmalıdır');
      assert.ok(res.chart);
      assert.equal(res.chart.isBirthTimeUnknown, true);
      assert.equal(res.chart.isAscendantDefinitive, false);
      assert.ok(
        res.chart.ascendantNoticeTr?.includes('12:00 varsayımı') &&
        res.chart.ascendantNoticeTr?.includes('kesin değildir'),
        'Kullanıcıya 12:00 varsayımı ve sonucun kesin olmadığı açıkça bildirilmelidir'
      );
      assert.ok(
        res.warningNotices.some((w) => w.includes('12:00') && w.includes('kesin değildir')),
        'Warning notices içinde açık bildirim yer almalıdır'
      );
    });

    it('1.4. Eksik veya geçersiz doğum koordinatlarında sahte sonuç üretilmemeli, hata verilmelidir', () => {
      const invalidClient: Client = {
        id: 'client_invalid_coords_a24',
        firstName: 'Test',
        lastName: 'EksikKonum',
        email: 'bad.coords@example.com',
        phone: '05550001133',
        birthDate: '1991-11-24',
        birthTime: '03:15',
        isBirthTimeUnknown: false,
        birthLocation: {
          city: '',
          country: '',
          placeName: '',
          latitude: null as any,
          longitude: null as any,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 120,
        },
        motherName: 'Songül',
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'OWNER_MANUAL',
        status: 'ACTIVE',
      };

      const res = calculateClientTropicalChart(invalidClient);
      assert.equal(res.success, false, 'Geçersiz koordinatta hesaplama başarısız olmalıdır');
      assert.equal(res.chart, undefined, 'Sahte harita nesnesi üretilmemelidir');
      assert.ok(res.errorMessageTr?.includes('koordinat'), 'Açık koordinat hatası verilmelidir');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Bağımsız Astronomik Referans Karşılaştırması (NASA JPL Horizons)
  // ---------------------------------------------------------------------------
  describe('2. Bağımsız Astronomik Referans Kontrolü (NASA JPL Horizons API Verileriyle)', () => {
    /**
     * Referans Kaynağı:
     * NASA/JPL Horizons Ephemeris System (DE441 Planetary Ephemeris)
     * API Endpoint: https://ssd.jpl.nasa.gov/api/horizons.api
     * Ephemeris Type: OBSERVER, Target Center: GEOCENTRIC (500@399)
     * Quantities: 31 (Observer Ecliptic Longitude and Latitude, True Equator and Equinox of Date)
     */

    // REFERANS VERİ SETİ 1: J2000 Epoch (2000-01-01 12:00:00 UTC)
    const J2000_JPL_HORIZONS_REFERENCE: Record<AstrologicalBodyId, { jplLon: number; expectedSign: string }> = {
      Sun:     { jplLon: 280.3689, expectedSign: 'Capricorn' },
      Moon:    { jplLon: 223.3238, expectedSign: 'Scorpio' },
      Mercury: { jplLon: 271.8893, expectedSign: 'Capricorn' },
      Venus:   { jplLon: 241.5658, expectedSign: 'Sagittarius' },
      Mars:    { jplLon: 327.9633, expectedSign: 'Aquarius' },
      Jupiter: { jplLon:  25.2531, expectedSign: 'Aries' },
      Saturn:  { jplLon:  40.3956, expectedSign: 'Taurus' },
      Uranus:  { jplLon: 314.8092, expectedSign: 'Aquarius' },
      Neptune: { jplLon: 303.1930, expectedSign: 'Aquarius' },
      Pluto:   { jplLon: 251.4548, expectedSign: 'Sagittarius' },
    };

    it('2.1. J2000 Epoch (2000-01-01 12:00 UTC) için 10 gök cismi NASA JPL Horizons verileriyle 0.005° (~18 yay saniyesi) içinde uyuşmalıdır', () => {
      const j2000Date = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));

      for (const [bodyId, ref] of Object.entries(J2000_JPL_HORIZONS_REFERENCE) as [AstrologicalBodyId, { jplLon: number; expectedSign: string }][]) {
        const coord = calculateRawBodyEcliptic(bodyId, j2000Date);
        const diff = Math.abs(coord.eclipticLongitude - ref.jplLon);

        assert.ok(
          diff <= 0.005,
          `${bodyId} boylamı JPL Horizons değerinden 0.005° den fazla sapamaz! JPL: ${ref.jplLon}°, Hesaplanan: ${coord.eclipticLongitude.toFixed(4)}°, Fark: ${diff.toFixed(4)}°`
        );
      }
    });

    // REFERANS VERİ SETİ 2: Gerçek Danışan Doğum Anı (Gizem Selma Genç: 1991-11-24 01:15:00 UTC)
    const GIZEM_JPL_HORIZONS_REFERENCE: Record<AstrologicalBodyId, { jplLon: number; expectedSign: string }> = {
      Sun:     { jplLon: 241.2483, expectedSign: 'Sagittarius' },
      Moon:    { jplLon:  89.8943, expectedSign: 'Gemini' },
      Mercury: { jplLon: 262.6303, expectedSign: 'Sagittarius' },
      Venus:   { jplLon: 196.0356, expectedSign: 'Libra' },
      Mars:    { jplLon: 236.4285, expectedSign: 'Scorpio' },
      Jupiter: { jplLon: 162.5451, expectedSign: 'Virgo' },
      Saturn:  { jplLon: 302.2006, expectedSign: 'Aquarius' },
      Uranus:  { jplLon: 281.5676, expectedSign: 'Capricorn' },
      Neptune: { jplLon: 284.9057, expectedSign: 'Capricorn' },
      Pluto:   { jplLon: 230.7293, expectedSign: 'Scorpio' },
    };

    it('2.2. Gizem Selma Genç doğum anı (1991-11-24 01:15 UTC) için 10 gök cismi NASA JPL Horizons verileriyle 0.005° içinde uyuşmalıdır', () => {
      const gizemUtcDate = new Date(Date.UTC(1991, 10, 24, 1, 15, 0));

      for (const [bodyId, ref] of Object.entries(GIZEM_JPL_HORIZONS_REFERENCE) as [AstrologicalBodyId, { jplLon: number; expectedSign: string }][]) {
        const coord = calculateRawBodyEcliptic(bodyId, gizemUtcDate);
        const diff = Math.abs(coord.eclipticLongitude - ref.jplLon);

        assert.ok(
          diff <= 0.005,
          `${bodyId} boylamı JPL Horizons değerinden 0.005° den fazla sapamaz! JPL: ${ref.jplLon}°, Hesaplanan: ${coord.eclipticLongitude.toFixed(4)}°, Fark: ${diff.toFixed(4)}°`
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Retrograd (Geri Hareket) ve İleri Hareket Hesaplamaları
  // ---------------------------------------------------------------------------
  describe('3. Gezegen Retrograd ve İleri Hareket Analizi', () => {
    it('3.1. Merkürün bilinen retrograd döneminde (2024-04-10) isRetrograde = true hesaplanmalıdır', () => {
      // 10 Nisan 2024 tarihinde Merkür Koç burcunda geri harekettedir
      const mercuryRetroDate = new Date(Date.UTC(2024, 3, 10, 12, 0, 0));
      const clientMercuryRetro: Client = {
        id: 'client_retro_test',
        firstName: 'Retro',
        lastName: 'Test',
        email: 'retro@example.com',
        phone: '05550002211',
        birthDate: '2024-04-10',
        birthTime: '15:00',
        isBirthTimeUnknown: false,
        birthLocation: {
          city: 'İstanbul',
          country: 'Türkiye',
          placeName: 'İstanbul, Türkiye',
          latitude: 41.0082,
          longitude: 28.9784,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 180,
        },
        motherName: 'Ayşe',
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'OWNER_MANUAL',
        status: 'ACTIVE',
      };

      const res = calculateClientTropicalChart(clientMercuryRetro);
      assert.equal(res.success, true);
      assert.ok(res.chart);

      const positions = res.chart.planetaryPositions || [];
      const mercury = positions.find((p) => p.body === 'Mercury');
      assert.ok(mercury, 'Merkür pozisyonu bulunmalıdır');
      assert.equal(mercury.isRetrograde, true, '2024-04-10 tarihinde Merkür isRetrograde = true olmalıdır');

      // Güneş ve Ay hiçbir koşulda retrograd olamaz
      const sun = positions.find((p) => p.body === 'Sun');
      const moon = positions.find((p) => p.body === 'Moon');
      assert.equal(sun?.isRetrograde, false, 'Güneş asla retrograd olamaz');
      assert.equal(moon?.isRetrograde, false, 'Ay asla retrograd olamaz');
    });

    it('3.2. Gezegenlerin ileri hareket döneminde isRetrograde = false olmalıdır', () => {
      // 1991-11-24 tarihinde Güneş, Ay ve Merkür ileri harekettedir
      const clientGizem: Client = {
        id: 'client_gizem_direct',
        firstName: 'Gizem Selma',
        lastName: 'Genç',
        email: 'gizem@example.com',
        phone: '05550003322',
        birthDate: '1991-11-24',
        birthTime: '03:15',
        isBirthTimeUnknown: false,
        birthLocation: {
          city: 'İstanbul',
          country: 'Türkiye',
          placeName: 'İstanbul, Fatih',
          latitude: 41.0182,
          longitude: 28.9497,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 120,
        },
        motherName: 'Songül',
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'OWNER_MANUAL',
        status: 'ACTIVE',
      };

      const res = calculateClientTropicalChart(clientGizem);
      assert.equal(res.success, true);
      const positions = res.chart?.planetaryPositions || [];
      const sun = positions.find((p) => p.body === 'Sun');
      const moon = positions.find((p) => p.body === 'Moon');
      const mercury = positions.find((p) => p.body === 'Mercury');

      assert.equal(sun?.isRetrograde, false);
      assert.equal(moon?.isRetrograde, false);
      assert.equal(mercury?.isRetrograde, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Tekrarlanabilirlik (Determinizm) ve Danışan İzolasyonu
  // ---------------------------------------------------------------------------
  describe('4. Tekrarlanabilirlik ve Danışan Veri İzolasyonu', () => {
    it('4.1. Aynı doğum verileriyle 20 ardışık hesaplamada 10 gök cismi boylamları %100 özdeş olmalıdır', () => {
      const clientGizem: Client = {
        id: 'client_gizem_det',
        firstName: 'Gizem Selma',
        lastName: 'Genç',
        email: 'gizem.det@example.com',
        phone: '05550004433',
        birthDate: '1991-11-24',
        birthTime: '03:15',
        isBirthTimeUnknown: false,
        birthLocation: {
          city: 'İstanbul',
          country: 'Türkiye',
          placeName: 'İstanbul, Fatih',
          latitude: 41.0182,
          longitude: 28.9497,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 120,
        },
        motherName: 'Songül',
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'OWNER_MANUAL',
        status: 'ACTIVE',
      };

      const baseRun = calculateClientTropicalChart(clientGizem);
      assert.equal(baseRun.success, true);
      assert.ok(baseRun.chart);
      const basePositions = baseRun.chart?.planetaryPositions || [];

      for (let i = 0; i < 20; i++) {
        const nextRun = calculateClientTropicalChart(clientGizem);
        assert.equal(nextRun.success, true);
        assert.ok(nextRun.chart);

        assert.equal(nextRun.chart.moonSign, baseRun.chart.moonSign);
        assert.equal(nextRun.chart.ascendantSign, baseRun.chart.ascendantSign);
        assert.equal(nextRun.chart.ascendantDegree, baseRun.chart.ascendantDegree);
        assert.equal(nextRun.chart.ascendantMinute, baseRun.chart.ascendantMinute);

        const nextPositions = nextRun.chart.planetaryPositions || [];
        for (let b = 0; b < 10; b++) {
          assert.equal(
            nextPositions[b].eclipticLongitude,
            basePositions[b].eclipticLongitude,
            `Gök cismi ${b} boylamı deterministik olmalıdır`
          );
        }
      }
    });

    it('4.2. Farklı danışanların hesaplamaları birbirini asla etkilememelidir (Danışan A İstanbul, Danışan B Londra)', () => {
      const clientA: Client = {
        id: 'client_a_ist',
        firstName: 'Danışan A',
        lastName: 'İstanbul',
        email: 'clientA@example.com',
        phone: '05551112233',
        birthDate: '1991-11-24',
        birthTime: '03:15',
        isBirthTimeUnknown: false,
        birthLocation: {
          city: 'İstanbul',
          country: 'Türkiye',
          placeName: 'İstanbul, Fatih',
          latitude: 41.0182,
          longitude: 28.9497,
          timezone: 'Europe/Istanbul',
          utcOffsetMinutes: 120,
        },
        motherName: 'Songül',
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'OWNER_MANUAL',
        status: 'ACTIVE',
      };

      const clientB: Client = {
        id: 'client_b_ldn',
        firstName: 'Danışan B',
        lastName: 'Londra',
        email: 'clientB@example.com',
        phone: '05554445566',
        birthDate: '1985-05-10',
        birthTime: '18:30',
        isBirthTimeUnknown: false,
        birthLocation: {
          city: 'London',
          country: 'UK',
          placeName: 'London, UK',
          latitude: 51.5074,
          longitude: -0.1278,
          timezone: 'Europe/London',
          utcOffsetMinutes: 60,
        },
        motherName: 'Mary',
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'OWNER_MANUAL',
        status: 'ACTIVE',
      };

      const resA = calculateClientTropicalChart(clientA);
      const resB = calculateClientTropicalChart(clientB);

      assert.equal(resA.success, true);
      assert.equal(resB.success, true);

      // Danışan A Ay: İkizler (Gemini), Danışan B Ay: Kova (Aquarius)
      assert.equal(resA.chart?.moonSign, 'Gemini');
      assert.equal(resB.chart?.moonSign, 'Aquarius');

      // Güneş ve gezegen konumları tamamen farklıdır
      assert.notEqual(resA.chart?.sunSign, resB.chart?.sunSign);
      const posA = resA.chart?.planetaryPositions || [];
      const posB = resB.chart?.planetaryPositions || [];
      assert.notEqual(
        posA[0]?.eclipticLongitude,
        posB[0]?.eclipticLongitude
      );
    });
  });
});
