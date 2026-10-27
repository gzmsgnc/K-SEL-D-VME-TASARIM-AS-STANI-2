/**
 * Global Zaman Dilimi ve UTC Sapma Yardımcısı
 * Batı / Tropical Astroloji hesaplamaları için enlem/boylam koordinatlarına göre
 * yaklaşık veya tam zaman dilimi ve UTC ofsetini belirler.
 */

export interface TimezoneEstimate {
  timezone: string;
  utcOffsetMinutes: number;
  formattedOffset: string; // örn: "UTC+03:00", "UTC-05:00"
}

/**
 * Koordinat ve ülke bilgisine göre IANA zaman dilimi ve UTC sapmasını tahmin eder.
 */
export function estimateTimezoneFromCoordinates(lat: number, lng: number, countryCode?: string): TimezoneEstimate {
  // Bilinen yaygın bölge eşleştirmeleri
  const code = countryCode?.toUpperCase();

  if (code === 'TR' || (lat >= 35.5 && lat <= 42.5 && lng >= 25.5 && lng <= 45.0)) {
    return {
      timezone: 'Europe/Istanbul',
      utcOffsetMinutes: 180, // UTC+3
      formattedOffset: 'UTC+03:00',
    };
  }

  if (code === 'GB' || code === 'UK') {
    return {
      timezone: 'Europe/London',
      utcOffsetMinutes: 0,
      formattedOffset: 'UTC+00:00',
    };
  }

  if (code === 'DE' || code === 'FR' || code === 'IT' || code === 'ES' || code === 'NL') {
    return {
      timezone: 'Europe/Berlin',
      utcOffsetMinutes: 60, // Kış UTC+1, yaz UTC+2
      formattedOffset: 'UTC+01:00',
    };
  }

  if (code === 'US' || code === 'USA') {
    if (lng < -115) {
      return { timezone: 'America/Los_Angeles', utcOffsetMinutes: -480, formattedOffset: 'UTC-08:00' };
    } else if (lng < -100) {
      return { timezone: 'America/Denver', utcOffsetMinutes: -420, formattedOffset: 'UTC-07:00' };
    } else if (lng < -85) {
      return { timezone: 'America/Chicago', utcOffsetMinutes: -360, formattedOffset: 'UTC-06:00' };
    } else {
      return { timezone: 'America/New_York', utcOffsetMinutes: -300, formattedOffset: 'UTC-05:00' };
    }
  }

  if (code === 'JP') {
    return { timezone: 'Asia/Tokyo', utcOffsetMinutes: 540, formattedOffset: 'UTC+09:00' };
  }

  if (code === 'AU') {
    return { timezone: 'Australia/Sydney', utcOffsetMinutes: 600, formattedOffset: 'UTC+10:00' };
  }

  // Genel Boylam Tabanlı Hesaplama (Her 15 boylam derecesi ~1 saat)
  const rawHours = Math.round(lng / 15);
  const clampedHours = Math.max(-12, Math.min(14, rawHours));
  const offsetMinutes = clampedHours * 60;
  const sign = clampedHours >= 0 ? '+' : '-';
  const absHours = Math.abs(clampedHours).toString().padStart(2, '0');

  return {
    timezone: `Etc/GMT${clampedHours >= 0 ? '-' + Math.abs(clampedHours) : '+' + Math.abs(clampedHours)}`, // POSIX Etc/GMT ters işaretlidir
    utcOffsetMinutes: offsetMinutes,
    formattedOffset: `UTC${sign}${absHours}:00`,
  };
}
