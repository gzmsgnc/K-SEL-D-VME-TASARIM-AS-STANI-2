import { GlobalLocation } from '../types/location';
import { estimateTimezoneFromCoordinates } from './timezones';

/**
 * Dünyanın önde gelen metropolleri ve Türkiye şehirleri için yerel hızlı arama veritabanı.
 * Dış API bağımlılığı olmadan anında arama ve koordinat eşleştirmesi sağlar.
 */
export interface PresetCity {
  country: string;
  countryCode: string;
  city: string;
  stateOrRegion?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export const PRESET_GLOBAL_CITIES: PresetCity[] = [
  // Türkiye
  { country: 'Türkiye', countryCode: 'TR', city: 'İstanbul', stateOrRegion: 'Marmara', latitude: 41.0082, longitude: 28.9784, timezone: 'Europe/Istanbul' },
  { country: 'Türkiye', countryCode: 'TR', city: 'Ankara', stateOrRegion: 'İç Anadolu', latitude: 39.9334, longitude: 32.8597, timezone: 'Europe/Istanbul' },
  { country: 'Türkiye', countryCode: 'TR', city: 'İzmir', stateOrRegion: 'Ege', latitude: 38.4237, longitude: 27.1428, timezone: 'Europe/Istanbul' },
  { country: 'Türkiye', countryCode: 'TR', city: 'Bursa', stateOrRegion: 'Marmara', latitude: 40.1885, longitude: 29.0610, timezone: 'Europe/Istanbul' },
  { country: 'Türkiye', countryCode: 'TR', city: 'Antalya', stateOrRegion: 'Akdeniz', latitude: 36.8969, longitude: 30.7133, timezone: 'Europe/Istanbul' },
  { country: 'Türkiye', countryCode: 'TR', city: 'Adana', stateOrRegion: 'Akdeniz', latitude: 37.0000, longitude: 35.3213, timezone: 'Europe/Istanbul' },
  { country: 'Türkiye', countryCode: 'TR', city: 'Eskişehir', stateOrRegion: 'İç Anadolu', latitude: 39.7667, longitude: 30.5256, timezone: 'Europe/Istanbul' },
  { country: 'Türkiye', countryCode: 'TR', city: 'Trabzon', stateOrRegion: 'Karadeniz', latitude: 41.0027, longitude: 39.7168, timezone: 'Europe/Istanbul' },
  { country: 'Türkiye', countryCode: 'TR', city: 'Gaziantep', stateOrRegion: 'Güneydoğu Anadolu', latitude: 37.0662, longitude: 37.3833, timezone: 'Europe/Istanbul' },
  { country: 'Türkiye', countryCode: 'TR', city: 'Konya', stateOrRegion: 'İç Anadolu', latitude: 37.8746, longitude: 32.4932, timezone: 'Europe/Istanbul' },

  // Avrupa
  { country: 'Almanya', countryCode: 'DE', city: 'Berlin', stateOrRegion: 'Berlin', latitude: 52.5200, longitude: 13.4050, timezone: 'Europe/Berlin' },
  { country: 'Almanya', countryCode: 'DE', city: 'Münih', stateOrRegion: 'Bayern', latitude: 48.1351, longitude: 11.5820, timezone: 'Europe/Berlin' },
  { country: 'Almanya', countryCode: 'DE', city: 'Köln', stateOrRegion: 'Nordrhein-Westfalen', latitude: 50.9375, longitude: 6.9603, timezone: 'Europe/Berlin' },
  { country: 'Birleşik Krallık', countryCode: 'GB', city: 'Londra', stateOrRegion: 'İngiltere', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { country: 'Fransa', countryCode: 'FR', city: 'Paris', stateOrRegion: 'Île-de-France', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
  { country: 'İtalya', countryCode: 'IT', city: 'Roma', stateOrRegion: 'Lazio', latitude: 41.9028, longitude: 12.4964, timezone: 'Europe/Rome' },
  { country: 'İtalya', countryCode: 'IT', city: 'Milano', stateOrRegion: 'Lombardia', latitude: 45.4642, longitude: 9.1900, timezone: 'Europe/Rome' },
  { country: 'İspanya', countryCode: 'ES', city: 'Madrid', stateOrRegion: 'Madrid', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' },
  { country: 'İspanya', countryCode: 'ES', city: 'Barselona', stateOrRegion: 'Katalonya', latitude: 41.3879, longitude: 2.1699, timezone: 'Europe/Madrid' },
  { country: 'Hollanda', countryCode: 'NL', city: 'Amsterdam', stateOrRegion: 'Kuzey Hollanda', latitude: 52.3676, longitude: 4.9041, timezone: 'Europe/Amsterdam' },
  { country: 'Avusturya', countryCode: 'AT', city: 'Viyana', stateOrRegion: 'Viyana', latitude: 48.2082, longitude: 16.3738, timezone: 'Europe/Vienna' },
  { country: 'Yunanistan', countryCode: 'GR', city: 'Atina', stateOrRegion: 'Attika', latitude: 37.9838, longitude: 23.7275, timezone: 'Europe/Athens' },

  // Amerika Kıtası
  { country: 'Amerika Birleşik Devletleri', countryCode: 'US', city: 'New York', stateOrRegion: 'New York', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' },
  { country: 'Amerika Birleşik Devletleri', countryCode: 'US', city: 'Los Angeles', stateOrRegion: 'Kaliforniya', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' },
  { country: 'Amerika Birleşik Devletleri', countryCode: 'US', city: 'Chicago', stateOrRegion: 'Illinois', latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago' },
  { country: 'Kanada', countryCode: 'CA', city: 'Toronto', stateOrRegion: 'Ontario', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto' },
  { country: 'Brezilya', countryCode: 'BR', city: 'São Paulo', stateOrRegion: 'São Paulo', latitude: -23.5505, longitude: -46.6333, timezone: 'America/Sao_Paulo' },

  // Asya & Okyanusya
  { country: 'Japonya', countryCode: 'JP', city: 'Tokyo', stateOrRegion: 'Kanto', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { country: 'Avustralya', countryCode: 'AU', city: 'Sidney', stateOrRegion: 'New South Wales', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { country: 'Birleşik Arap Emirlikleri', countryCode: 'AE', city: 'Dubai', stateOrRegion: 'Dubai', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai' },
  { country: 'Mısır', countryCode: 'EG', city: 'Kahire', stateOrRegion: 'Kahire', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo' },
];

/**
 * Verilen metinle global şehirleri filtreler.
 */
export function searchPresetCities(query: string): PresetCity[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  return PRESET_GLOBAL_CITIES.filter((item) =>
    item.city.toLowerCase().includes(q) ||
    item.country.toLowerCase().includes(q) ||
    (item.stateOrRegion && item.stateOrRegion.toLowerCase().includes(q))
  );
}

/**
 * Koordinatları adrese çeviren ters coğrafi kodlama (Reverse Geocoding).
 * Önce harita tıklamasıyla gelen koordinatları OpenStreetMap Nominatim ile sorgular,
 * çevrimdışıysa veya hata olursa yerel koordinat hesaplamasını devreye sokar.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<GlobalLocation> {
  const tzEstimate = estimateTimezoneFromCoordinates(lat, lng);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'tr,en',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const country = addr.country || 'Bilinmeyen Ülke';
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || 'Bilinmeyen Şehir';
      const stateOrRegion = addr.state || addr.province || addr.region || '';
      const district = addr.suburb || addr.district || addr.neighbourhood || '';
      const placeName = data.display_name || `${city}, ${country}`;

      const dynamicTz = estimateTimezoneFromCoordinates(lat, lng, addr.country_code);

      return {
        country,
        countryCode: addr.country_code?.toUpperCase(),
        city,
        stateOrRegion,
        district,
        placeName,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        timezone: dynamicTz.timezone,
        utcOffsetMinutes: dynamicTz.utcOffsetMinutes,
        source: 'MAP_CLICK',
      };
    }
  } catch {
    // Ağ kısıtlaması veya zaman aşımında sessizce yerel koordinat modeline geçer
  }

  // Yedek Konum Çözümlemesi
  return {
    country: 'Global Koordinat',
    city: `${lat >= 0 ? lat.toFixed(4) + '°K' : Math.abs(lat).toFixed(4) + '°G'}`,
    placeName: `Koordinat: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    timezone: tzEstimate.timezone,
    utcOffsetMinutes: tzEstimate.utcOffsetMinutes,
    source: 'MAP_CLICK',
  };
}
