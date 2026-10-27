/**
 * Global Konum ve Coğrafi Veri Modeli
 * Dünya genelindeki doğum yerlerini ve koordinatları tutarlı bir biçimde saklar.
 */
export interface GlobalLocation {
  country: string;              // Ülke (örn: Türkiye, Almanya, Amerika Birleşik Devletleri)
  countryCode?: string;          // ISO Ülke Kodu (örn: TR, DE, US)
  city: string;                 // Şehir (örn: İstanbul, Berlin, New York)
  stateOrRegion?: string;       // İl / Eyalet / Bölge (örn: Marmara, Bayern, New York State)
  district?: string;            // İlçe / Yerel Bölge (örn: Kadıköy, Kreuzberg, Brooklyn)
  placeName: string;            // Yerleşim Yeri / Seçilen Lokasyonun Tam Adı
  latitude: number;             // Enlem (-90 ile +90 arası ondalıklı derece)
  longitude: number;            // Boylam (-180 ile +180 arası ondalıklı derece)
  timezone: string;             // IANA Zaman Dilimi (örn: Europe/Istanbul, Europe/Berlin, America/New_York)
  utcOffsetMinutes: number;     // UTC'den sapma dakikası (örn: +180 = UTC+3)
  source?: 'MAP_CLICK' | 'SEARCH_SELECT' | 'MANUAL_ENTRY'; // Konumun seçilme kaynağı
}

/**
 * Harita merkez ve yakınlaştırma durumu
 */
export interface MapViewState {
  center: [number, number];     // [enlem, boylam]
  zoom: number;                 // Yakınlaştırma derecesi
}
