import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  eclipticLongitudeToZodiac,
  calculateRawBodyEcliptic,
  AstrologicalBodyId,
} from '../astrologyCalculationEngine';
import { calculateClientTropicalChart } from '../astrologyEngineAdapter';
import { Client } from '../../../types/client';

describe('A9: Astroloji Hesaplama Sınır Değerleri ve Regresyon Testleri', () => {
  // -------------------------------------------------------------------------
  // 1. Kritik Sınır Boylamları ve Normalleştirme (0°, 29.999°, 30°, 359.999°, 360°)
  // -------------------------------------------------------------------------
  describe('1. Kritik Sınır Boylamları ve Normalleştirme', () => {
    it('0° ekliptik boylamı 0° Koç 0\' olarak dönüştürülmelidir', () => {
      const res = eclipticLongitudeToZodiac(0);
      assert.equal(res.sign, 'Aries');
      assert.equal(res.degree, 0);
      assert.equal(res.minute, 0);
      assert.equal(res.formattedText, "0° Koç 0'");
    });

    it('29.999° ekliptik boylamı Koç burcunda kalmalı ve 29° Koç 59\' olarak dönüştürülmelidir (Aşağı Yuvarlama)', () => {
      // Matematiksel Açıklama:
      // 29.999° = 29° + (0.999 * 60)' = 29° + 59.94' = 29° 59' 56.40"
      // Kodumuz altmışlık dakika taşmasını (60') önlemek amacıyla aşağı yuvarlama (Math.floor) kullanır.
      // Math.floor(59.94) = 59 dakika üretilir.
      const res = eclipticLongitudeToZodiac(29.999);
      assert.equal(res.sign, 'Aries');
      assert.equal(res.degree, 29);
      assert.equal(res.minute, 59);
      assert.equal(res.formattedText, "29° Koç 59'");
    });

    it('30° ekliptik boylamı Boğa burcuna geçmeli ve 0° Boğa 0\' olmalıdır', () => {
      const res = eclipticLongitudeToZodiac(30);
      assert.equal(res.sign, 'Taurus');
      assert.equal(res.degree, 0);
      assert.equal(res.minute, 0);
      assert.equal(res.formattedText, "0° Boğa 0'");
    });

    it('359.999° ekliptik boylamı Balık burcunda 29° Balık 59\' olmalıdır', () => {
      const res = eclipticLongitudeToZodiac(359.999);
      assert.equal(res.sign, 'Pisces');
      assert.equal(res.degree, 29);
      assert.equal(res.minute, 59);
      assert.equal(res.formattedText, "29° Balık 59'");
    });

    it('360° tam çember boylamı modülo ile 0° Koç 0\' olarak sıfırlanmalıdır', () => {
      const res = eclipticLongitudeToZodiac(360);
      assert.equal(res.sign, 'Aries');
      assert.equal(res.degree, 0);
      assert.equal(res.minute, 0);
      assert.equal(res.formattedText, "0° Koç 0'");
    });

    it('Negatif boylamlar güvenli biçimde [0, 360) aralığına normalleştirilmelidir', () => {
      // -0.001° -> 359.999° (29° Balık 59')
      const negSmall = eclipticLongitudeToZodiac(-0.001);
      assert.equal(negSmall.sign, 'Pisces');
      assert.equal(negSmall.degree, 29);
      assert.equal(negSmall.minute, 59);

      // -30° -> 330° (0° Balık 0')
      const neg30 = eclipticLongitudeToZodiac(-30);
      assert.equal(neg30.sign, 'Pisces');
      assert.equal(neg30.degree, 0);
      assert.equal(neg30.minute, 0);

      // -90° -> 270° (0° Oğlak 0')
      const neg90 = eclipticLongitudeToZodiac(-90);
      assert.equal(neg90.sign, 'Capricorn');
      assert.equal(neg90.degree, 0);
      assert.equal(neg90.minute, 0);

      // -360° -> 0° (0° Koç 0')
      const neg360 = eclipticLongitudeToZodiac(-360);
      assert.equal(neg360.sign, 'Aries');
      assert.equal(neg360.degree, 0);
      assert.equal(neg360.minute, 0);

      // -750° -> -30° -> 330° (0° Balık 0')
      const neg750 = eclipticLongitudeToZodiac(-750);
      assert.equal(neg750.sign, 'Pisces');
      assert.equal(neg750.degree, 0);
      assert.equal(neg750.minute, 0);
    });

    it('360° üzerindeki boylamlar güvenli biçimde normalleştirilmelidir', () => {
      // 360.001° -> 0.001° (0° Koç 0')
      const overSmall = eclipticLongitudeToZodiac(360.001);
      assert.equal(overSmall.sign, 'Aries');
      assert.equal(overSmall.degree, 0);
      assert.equal(overSmall.minute, 0);

      // 390° -> 30° (0° Boğa 0')
      const over390 = eclipticLongitudeToZodiac(390);
      assert.equal(over390.sign, 'Taurus');
      assert.equal(over390.degree, 0);
      assert.equal(over390.minute, 0);

      // 720° -> 0° (0° Koç 0')
      const over720 = eclipticLongitudeToZodiac(720);
      assert.equal(over720.sign, 'Aries');
      assert.equal(over720.degree, 0);
      assert.equal(over720.minute, 0);

      // 1080.5° -> 0.5° (0° Koç 30')
      const over1080 = eclipticLongitudeToZodiac(1080.5);
      assert.equal(over1080.sign, 'Aries');
      assert.equal(over1080.degree, 0);
      assert.equal(over1080.minute, 30);
    });
  });

  // -------------------------------------------------------------------------
  // 2. 12 Burç Sınırında Toplam 273 Sınır Noktası ve Taşma Koruması
  // -------------------------------------------------------------------------
  describe('2. 12 Burç Sınırı ve Epsilon Sapmaları (273 Sınır Noktası)', () => {
    it('12 burç sınırında derecenin 30 veya dakikanın 60 değerine taşmadığı doğrulanmalıdır', () => {
      const epsilons = [1e-12, 1e-9, 1e-6, 1e-4, 1e-3, 0.001, 0.01];
      let evaluatedPointsCount = 0;

      // 13 sınır çizgisi (0°'den 360°'ye 30'ar derece)
      for (let bound = 0; bound <= 360; bound += 30) {
        for (const eps of epsilons) {
          const testPoints = [bound - eps, bound, bound + eps];
          for (const pt of testPoints) {
            evaluatedPointsCount++;
            const res = eclipticLongitudeToZodiac(pt);

            // 1. Derece taşma kontrolü: 0 <= degree <= 29
            assert.ok(
              res.degree >= 0 && res.degree < 30,
              `Geçersiz derece! Boylam: ${pt}, Derece: ${res.degree} (30'a taşamaz)`
            );

            // 2. Dakika taşma kontrolü: 0 <= minute <= 59
            assert.ok(
              res.minute >= 0 && res.minute < 60,
              `Geçersiz dakika! Boylam: ${pt}, Dakika: ${res.minute} (60'a taşamaz)`
            );

            // 3. Burç geçerliliği kontrolü
            assert.ok(typeof res.sign === 'string' && res.sign.length > 0, 'Burç adı boş olamaz');
          }
        }
      }

      // Toplam kontrol noktası sayısı: 13 sınır * 7 epsilon * 3 örnek = 273 nokta
      assert.equal(evaluatedPointsCount, 273, 'Tam 273 sınır noktası taranmalıdır');
    });
  });

  // -------------------------------------------------------------------------
  // 3. 29.999° İçin Matematiksel Hassasiyet ve Aşağı Yuvarlama Doğrulaması
  // -------------------------------------------------------------------------
  describe('3. 29.999° Matematiksel Derece-Dakika-Saniye İncelemesi', () => {
    it('29.999° değerinin sexagesimal bileşenleri ve aşağı yuvarlama kuralı doğrulanmalıdır', () => {
      const lon = 29.999;
      const degInSign = lon;
      const degFloor = Math.floor(degInSign);
      const remainingMinutesRaw = (degInSign - degFloor) * 60; // 59.94
      const minFloor = Math.floor(remainingMinutesRaw); // 59
      const minRound = Math.round(remainingMinutesRaw); // 60 (Taşma yaratır!)
      const secRaw = (remainingMinutesRaw - minFloor) * 60; // 56.40"

      // Matematiksel doğrulamalar:
      assert.equal(degFloor, 29);
      assert.ok(Math.abs(remainingMinutesRaw - 59.94) < 1e-9);
      assert.equal(minFloor, 59, 'Aşağı yuvarlama ile dakika 59 olmalıdır');
      assert.equal(minRound, 60, 'Matematiksel yuvarlama 60 üreterek taşma oluşturur');
      assert.ok(Math.abs(secRaw - 56.4) < 1e-6, 'Saniye değeri 56.40" olmalıdır');

      // Üretim fonksiyonunun çıktısıyla eşleşme
      const prodRes = eclipticLongitudeToZodiac(lon);
      assert.equal(prodRes.degree, degFloor);
      assert.equal(prodRes.minute, minFloor);
      assert.notEqual(
        prodRes.minute,
        minRound,
        'Fonksiyon asla Math.round (60 dakika) üretmemelidir'
      );
    });
  });

  // -------------------------------------------------------------------------
  // 4. Sonlu Sayı Güvencesi, NaN / Infinity ve Hatalı Girdi İzolasyonu
  // -------------------------------------------------------------------------
  describe('4. Sonlu Sayı Güvencesi ve Hatalı Girdi Reddi', () => {
    it('Tüm gök cisimleri için hesaplanan astronomik çıktılar sonlu ve geçerli sayılar olmalıdır', () => {
      const testDates = [
        new Date('1900-01-01T00:00:00Z'),
        new Date('1950-06-15T12:00:00Z'),
        new Date('2000-01-01T12:00:00Z'),
        new Date('2026-10-19T05:30:00Z'),
        new Date('2050-12-31T23:59:59Z'),
      ];

      const bodies: AstrologicalBodyId[] = [
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

      for (const d of testDates) {
        for (const b of bodies) {
          const raw = calculateRawBodyEcliptic(b, d);
          const z = eclipticLongitudeToZodiac(raw.eclipticLongitude);

          assert.ok(
            Number.isFinite(raw.eclipticLongitude) && !Number.isNaN(raw.eclipticLongitude),
            `${b} boylamı sonlu olmalıdır`
          );
          assert.ok(
            Number.isFinite(raw.eclipticLatitude) && !Number.isNaN(raw.eclipticLatitude),
            `${b} enlemi sonlu olmalıdır`
          );
          assert.ok(
            Number.isFinite(raw.distanceAu) && !Number.isNaN(raw.distanceAu) && raw.distanceAu > 0,
            `${b} uzaklığı pozitif sonlu olmalıdır`
          );
          assert.ok(
            Number.isFinite(z.degree) && !Number.isNaN(z.degree),
            `${b} burç derecesi sonlu olmalıdır`
          );
          assert.ok(
            Number.isFinite(z.minute) && !Number.isNaN(z.minute),
            `${b} burç dakikası sonlu olmalıdır`
          );
        }
      }
    });

    it('Eksik doğum tarihi içeren danışan girdisi reddedilmeli ve sahte/NaN sonuç üretilmemelidir', () => {
      const invalidClient: Partial<Client> = {
        id: 'bad_date_client',
        birthDate: '',
        birthLocation: {
          latitude: 41.0082,
          longitude: 28.9784,
          timezone: 'Europe/Istanbul',
          placeName: 'Istanbul',
          city: 'Istanbul',
          country: 'Turkey',
          source: 'MAP_CLICK',
          utcOffsetMinutes: 180,
        },
      };

      const res = calculateClientTropicalChart(invalidClient as Client);
      assert.equal(res.success, false);
      assert.equal(res.chart, undefined);
      assert.ok(res.errorMessageTr && res.errorMessageTr.length > 0);
    });

    it('Geçersiz (NaN) koordinat içeren danışan girdisi reddedilmelidir', () => {
      const invalidClient: Partial<Client> = {
        id: 'nan_coords_client',
        birthDate: '1990-01-01',
        birthLocation: {
          latitude: NaN,
          longitude: 28.9784,
          timezone: 'Europe/Istanbul',
          placeName: 'Istanbul',
          city: 'Istanbul',
          country: 'Turkey',
          source: 'MAP_CLICK',
          utcOffsetMinutes: 180,
        },
      };

      const res = calculateClientTropicalChart(invalidClient as Client);
      assert.equal(res.success, false);
      assert.equal(res.chart, undefined);
      assert.ok(res.errorMessageTr && res.errorMessageTr.includes('koordinat'));
    });

    it('Sonsuz (Infinity) koordinat içeren danışan girdisi reddedilmelidir', () => {
      const invalidClient: Partial<Client> = {
        id: 'inf_coords_client',
        birthDate: '1990-01-01',
        birthLocation: {
          latitude: 41.0082,
          longitude: Infinity,
          timezone: 'Europe/Istanbul',
          placeName: 'Istanbul',
          city: 'Istanbul',
          country: 'Turkey',
          source: 'MAP_CLICK',
          utcOffsetMinutes: 180,
        },
      };

      const res = calculateClientTropicalChart(invalidClient as Client);
      assert.equal(res.success, false);
      assert.equal(res.chart, undefined);
      assert.ok(res.errorMessageTr && res.errorMessageTr.includes('koordinat'));
    });
  });

  // -------------------------------------------------------------------------
  // 5. 10 Gök Cisminin Benzersizliği, Kimlikleri ve Kanonik Sırası
  // -------------------------------------------------------------------------
  describe('5. 10 Gök Cismi Benzersizlik, Kimlik ve Kanonik Sıralama', () => {
    it('Hesaplanan haritada 10 gök cismi tam olarak 1 kez bulunmalı ve kanonik sıraya uymalıdır', () => {
      const validClient: Client = {
        id: 'canonical_test_client',
        firstName: 'Test',
        lastName: 'Danışan',
        email: 'test@example.com',
        phone: '05551234567',
        birthDate: '1992-07-20',
        birthTime: '15:45',
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
        motherName: 'Emine',
        notes: '',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        source: 'OWNER_MANUAL',
        status: 'ACTIVE',
      };

      const res = calculateClientTropicalChart(validClient);
      assert.equal(res.success, true);
      assert.ok(res.chart !== undefined);
      assert.ok(res.chart.planetaryPositions !== undefined);

      const positions = res.chart.planetaryPositions;
      assert.equal(positions.length, 10, 'Toplam gök cismi sayısı 10 olmalıdır');

      const extractedBodies = positions.map((p) => p.body);
      const expectedOrder: AstrologicalBodyId[] = [
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

      // 1. Kanonik sıra kontrolü
      assert.deepEqual(extractedBodies, expectedOrder, 'Gök cisimleri kanonik sırada olmalıdır');

      // 2. Benzersizlik kontrolü (çift kayıt yok)
      const uniqueBodies = new Set(extractedBodies);
      assert.equal(uniqueBodies.size, 10, '10 gök cisminin her biri tam olarak bir kez bulunmalıdır');

      // 3. Her cismin konum ve burç özelliklerinin doğruluğu
      for (const pos of positions) {
        assert.ok(typeof pos.sign === 'string' && pos.sign.length > 0);
        assert.ok(pos.degree >= 0 && pos.degree < 30);
        assert.ok(pos.minute >= 0 && pos.minute < 60);
        assert.ok(pos.eclipticLongitude !== undefined && pos.eclipticLongitude >= 0 && pos.eclipticLongitude < 360);
        assert.equal(typeof pos.isRetrograde, 'boolean');
      }
    });
  });
});
