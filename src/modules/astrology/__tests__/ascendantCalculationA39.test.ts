import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateClientTropicalChart } from '../astrologyEngineAdapter';
import { calculateAscendant } from '../astrologyCalculationEngine';
import { Client } from '../../../types/client';
import { clearAllApplicationData, saveClientAstrologyChart, getClientArchive, createClientRecord } from '../../../store/storage';

describe('A39 — Yükselen Burç (ASC) Hesaplama Doğrulama Testleri', () => {
  // Standart Referans Danışan: Elif Demir
  const elifDemirClient: Client = {
    id: 'elif_demir_client',
    firstName: 'Elif',
    lastName: 'Demir',
    email: 'elif.demir@example.com',
    phone: '05321112233',
    birthDate: '1992-06-15',
    birthTime: '14:30',
    isBirthTimeUnknown: false,
    birthLocation: {
      placeName: 'İstanbul, Türkiye',
      city: 'İstanbul',
      country: 'Türkiye',
      latitude: 41.0082,
      longitude: 28.9784,
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180,
    },
    motherName: 'Fatma',
    notes: 'A39 Referans Danışanı',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    source: 'OWNER_MANUAL',
    status: 'ACTIVE',
  };

  // 1. Test: Elif Demir için Yükselen Burç (ASC) ve Derecesi
  it('1. Elif Demir (15.06.1992 14:30 İstanbul) için Yükselen Burç Terazi (Libra) 12° 14\' olarak hesaplanmalıdır', () => {
    const res = calculateClientTropicalChart(elifDemirClient);

    assert.equal(res.success, true);
    assert.ok(res.chart !== undefined);

    // ASC kontrolü
    assert.equal(res.chart.ascendantSign, 'Libra');
    assert.equal(res.chart.ascendantDegree, 12);
    assert.equal(res.chart.ascendantMinute, 14);
    assert.equal(res.chart.formattedAscendantTr, "12° Terazi 14'");

    // Güneş ve Ay pozisyonlarının korunduğu kontrolü
    assert.equal(res.chart.sunSign, 'Gemini');
    assert.equal(res.chart.moonSign, 'Sagittarius');
    const sunPos = res.chart.planetaryPositions?.find((p) => p.body === 'Sun');
    assert.equal(sunPos?.sign, 'Gemini');
    assert.equal(sunPos?.degree, 24);
    assert.equal(sunPos?.minute, 36);

    const moonPos = res.chart.planetaryPositions?.find((p) => p.body === 'Moon');
    assert.equal(moonPos?.sign, 'Sagittarius');
    assert.equal(moonPos?.degree, 27);
    assert.equal(moonPos?.minute, 46);

    // Evler ve MC'nin hesaplanmadığı kontrolü (A39 kapsam dışı kuralı)
    assert.equal(res.chart.houseCusps, undefined);
  });

  // 2. Test: Doğum saati bilinmiyorsa ASC üretilmemeli
  it('2. Doğum saati bilinmediğinde (isBirthTimeUnknown: true) ASC üretilmemeli (undefined kalmalı)', () => {
    const unknownTimeClient: Client = {
      ...elifDemirClient,
      id: 'unknown_time_client',
      isBirthTimeUnknown: true,
      birthTime: '',
    };

    const res = calculateClientTropicalChart(unknownTimeClient);

    assert.equal(res.success, true);
    assert.ok(res.chart !== undefined);

    // ASC kesinlikle undefined olmalı
    assert.equal(res.chart.ascendantSign, undefined);
    assert.equal(res.chart.ascendantDegree, undefined);
    assert.equal(res.chart.ascendantMinute, undefined);
    assert.equal(res.chart.formattedAscendantTr, undefined);

    // 12:00 öğle referansı bayrağı aktif olmalı
    assert.equal(res.isNoonReference, true);
    assert.equal(res.chart.isBirthTimeUnknown, true);
  });

  // 3. Test: Doğum saati boş bırakıldığında da ASC üretilmemeli
  it('3. Doğum saati boş bırakıldığında ASC üretilmemelidir', () => {
    const emptyTimeClient: Client = {
      ...elifDemirClient,
      id: 'empty_time_client',
      isBirthTimeUnknown: false,
      birthTime: '',
    };

    const res = calculateClientTropicalChart(emptyTimeClient);

    assert.equal(res.success, true);
    assert.ok(res.chart !== undefined);
    assert.equal(res.chart.ascendantSign, undefined);
  });

  // 4. Test: Farklı saatlerde ASC'nin zamana duyarlı değiştiği
  it('4. Farklı doğum saatlerinde ASC burcu ve derecesi zamana duyarlı olarak değişmelidir', () => {
    // Sabah 06:00
    const morningClient: Client = {
      ...elifDemirClient,
      id: 'morning_client',
      birthTime: '06:00',
    };
    const resMorning = calculateClientTropicalChart(morningClient);
    assert.equal(resMorning.success, true);
    assert.ok(resMorning.chart?.ascendantSign !== undefined);
    assert.notEqual(resMorning.chart?.ascendantSign, 'Libra');

    // Gece 23:30
    const nightClient: Client = {
      ...elifDemirClient,
      id: 'night_client',
      birthTime: '23:30',
    };
    const resNight = calculateClientTropicalChart(nightClient);
    assert.equal(resNight.success, true);
    assert.ok(resNight.chart?.ascendantSign !== undefined);
    assert.notEqual(resNight.chart?.ascendantSign, resMorning.chart?.ascendantSign);
  });

  // 5. Test: calculateAscendant fonksiyonu bağımsız matematiksel doğrulaması
  it('5. calculateAscendant fonksiyonu enlem ve boylam sınırlarını denetlemeli ve deterministik olmalıdır', () => {
    const utcDate = new Date('1992-06-15T11:30:00Z');
    const asc1 = calculateAscendant(utcDate, 41.0082, 28.9784);
    const asc2 = calculateAscendant(utcDate, 41.0082, 28.9784);

    assert.equal(asc1.sign, 'Libra');
    assert.equal(asc1.degree, 12);
    assert.equal(asc1.minute, 14);
    assert.equal(asc1.eclipticLongitude, asc2.eclipticLongitude, 'Deterministik olmalıdır');

    // Geçersiz enlem kontrolü
    assert.throws(() => calculateAscendant(utcDate, 95, 28.9784), /Geçersiz enlem/);
    assert.throws(() => calculateAscendant(utcDate, 41.0082, 195), /Geçersiz boylam/);
  });

  // 6. Test: Danışan İzolasyonu ve Storage Kaydı
  it('6. Hesaplanan ASC doğru clientId ile kaydedilmeli ve diğer danışanlara sızmamalıdır', () => {
    clearAllApplicationData();

    const clientA = createClientRecord({
      firstName: elifDemirClient.firstName,
      lastName: elifDemirClient.lastName,
      email: 'a@example.com',
      phone: '05551112233',
      birthDate: elifDemirClient.birthDate,
      birthTime: '14:30',
      isBirthTimeUnknown: false,
      birthLocation: elifDemirClient.birthLocation,
      motherName: 'Fatma',
      notes: '',
    }, 'OWNER_MANUAL');

    const clientB = createClientRecord({
      firstName: 'Bilinmeyen',
      lastName: 'Kullanıcı',
      email: 'b@example.com',
      phone: '05559998877',
      birthDate: elifDemirClient.birthDate,
      birthTime: '',
      isBirthTimeUnknown: true,
      birthLocation: elifDemirClient.birthLocation,
      motherName: 'Ayşe',
      notes: '',
    }, 'OWNER_MANUAL');

    const chartA = calculateClientTropicalChart(clientA).chart!;
    const chartB = calculateClientTropicalChart(clientB).chart!;

    saveClientAstrologyChart(clientA.id, chartA);
    saveClientAstrologyChart(clientB.id, chartB);

    const archiveA = getClientArchive(clientA.id);
    const archiveB = getClientArchive(clientB.id);

    assert.equal(archiveA?.analyses[0]?.astrology?.ascendantSign, 'Libra');
    assert.equal(archiveA?.analyses[0]?.astrology?.ascendantDegree, 12);
    assert.equal(archiveA?.analyses[0]?.astrology?.ascendantMinute, 14);
    assert.equal(archiveB?.analyses[0]?.astrology?.ascendantSign, undefined);
  });
});
