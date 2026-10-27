import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GlobalLocation } from '../../types/location';
import { searchPresetCities, reverseGeocodeCoordinates, PresetCity } from '../../utils/geocoding';
import { estimateTimezoneFromCoordinates } from '../../utils/timezones';
import { MapPin, Search, Globe, Navigation, Compass, AlertCircle } from 'lucide-react';

interface GlobalLocationPickerProps {
  value: GlobalLocation;
  onChange: (location: GlobalLocation) => void;
  error?: string;
  disabled?: boolean;
}

export const GlobalLocationPicker: React.FC<GlobalLocationPickerProps> = ({
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PresetCity[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [showManualCoords, setShowManualCoords] = useState(false);

  // Özel altın/amber dövme pini ikonu
  const createPinIcon = () => {
    return L.divIcon({
      className: 'bg-transparent border-0',
      html: `
        <div style="transform: translate(-50%, -100%);" class="flex flex-col items-center">
          <div class="w-7 h-7 rounded-full bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/40">
            <div class="w-2 h-2 rounded-full bg-amber-300"></div>
          </div>
          <div class="w-0.5 h-2.5 bg-amber-400"></div>
        </div>
      `,
      iconSize: [28, 38],
      iconAnchor: [14, 38],
    });
  };

  // Harita Başlatma
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = value?.latitude || 41.0082;
    const initialLng = value?.longitude || 28.9784;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 6,
      minZoom: 2,
      maxZoom: 18,
      attributionControl: false,
    });

    // Açık kaynak OpenStreetMap Dark uyumlu katman
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // İlk Marker
    const marker = L.marker([initialLat, initialLng], {
      icon: createPinIcon(),
      draggable: !disabled,
    }).addTo(map);

    markerRef.current = marker;
    mapInstanceRef.current = map;

    // Haritaya tıklama olayı
    map.on('click', async (e: L.LeafletMouseEvent) => {
      if (disabled) return;
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);

      setIsResolving(true);
      const resolved = await reverseGeocodeCoordinates(lat, lng);
      setIsResolving(false);
      onChange(resolved);
    });

    // Pin sürükleme olayı
    marker.on('dragend', async () => {
      if (disabled) return;
      const pos = marker.getLatLng();
      setIsResolving(true);
      const resolved = await reverseGeocodeCoordinates(pos.lat, pos.lng);
      setIsResolving(false);
      onChange(resolved);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Değer dışarıdan değiştiğinde haritayı ve pini senkronize et
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !value) return;
    const currentPos = markerRef.current.getLatLng();
    if (
      Math.abs(currentPos.lat - value.latitude) > 0.0001 ||
      Math.abs(currentPos.lng - value.longitude) > 0.0001
    ) {
      markerRef.current.setLatLng([value.latitude, value.longitude]);
      mapInstanceRef.current.setView([value.latitude, value.longitude], 10, {
        animate: true,
      });
    }
  }, [value?.latitude, value?.longitude]);

  // Arama Girişi
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length >= 2) {
      const results = searchPresetCities(query);
      setSearchResults(results);
      setShowSearchDropdown(true);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  };

  // Şehir Seçildiğinde
  const handleSelectCity = (preset: PresetCity) => {
    setSearchQuery(`${preset.city}, ${preset.country}`);
    setShowSearchDropdown(false);

    const tz = estimateTimezoneFromCoordinates(preset.latitude, preset.longitude, preset.countryCode);

    const newLoc: GlobalLocation = {
      country: preset.country,
      countryCode: preset.countryCode,
      city: preset.city,
      stateOrRegion: preset.stateOrRegion,
      district: '',
      placeName: `${preset.city}, ${preset.country}`,
      latitude: preset.latitude,
      longitude: preset.longitude,
      timezone: preset.timezone || tz.timezone,
      utcOffsetMinutes: tz.utcOffsetMinutes,
      source: 'SEARCH_SELECT',
    };

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([preset.latitude, preset.longitude]);
      mapInstanceRef.current.setView([preset.latitude, preset.longitude], 10);
    }

    onChange(newLoc);
  };

  // Manuel Koordinat Değişimi
  const handleManualCoordChange = (latVal: string, lngVal: string) => {
    const lat = parseFloat(latVal);
    const lng = parseFloat(lngVal);

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const tz = estimateTimezoneFromCoordinates(lat, lng);
      const updated: GlobalLocation = {
        ...value,
        latitude: lat,
        longitude: lng,
        timezone: tz.timezone,
        utcOffsetMinutes: tz.utcOffsetMinutes,
        source: 'MANUAL_ENTRY',
      };
      if (markerRef.current && mapInstanceRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom());
      }
      onChange(updated);
    }
  };

  return (
    <div className="space-y-3">
      {/* Üst Arama ve Kontrol Barı */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInput}
              disabled={disabled}
              placeholder="Şehir veya ülke ara (örn: İstanbul, Berlin, Londra, Tokyo, New York...)"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-900 border border-stone-800 rounded-lg text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/80 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowManualCoords(!showManualCoords)}
            disabled={disabled}
            className="px-3.5 py-2.5 text-xs font-medium text-stone-300 bg-stone-900 border border-stone-800 rounded-lg hover:border-stone-700 hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Koordinat Girişi</span>
          </button>
        </div>

        {/* Otomatik Tamamlama Açılır Listesi */}
        {showSearchDropdown && searchResults.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1.5 bg-stone-900 border border-stone-800 rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
            {searchResults.map((item, idx) => (
              <button
                key={`${item.city}-${item.country}-${idx}`}
                type="button"
                onClick={() => handleSelectCity(item)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-stone-800/80 flex items-center justify-between transition-colors border-b border-stone-800/50 last:border-0"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-medium text-stone-200">{item.city}</span>
                    <span className="text-xs text-stone-400 ml-1.5">
                      {item.stateOrRegion ? `${item.stateOrRegion}, ` : ''}{item.country}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono text-stone-500">
                  {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manuel Koordinat Açılır Paneli */}
      {showManualCoords && (
        <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-stone-400 mb-1">Enlem (Latitude, -90° ile +90°)</label>
            <input
              type="number"
              step="any"
              value={value?.latitude || ''}
              onChange={(e) => handleManualCoordChange(e.target.value, String(value?.longitude || 0))}
              className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded font-mono text-stone-200 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-stone-400 mb-1">Boylam (Longitude, -180° ile +180°)</label>
            <input
              type="number"
              step="any"
              value={value?.longitude || ''}
              onChange={(e) => handleManualCoordChange(String(value?.latitude || 0), e.target.value)}
              className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded font-mono text-stone-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      )}

      {/* İnteraktif Global Harita Kutusu */}
      <div className="relative w-full h-64 sm:h-72 rounded-lg border border-stone-800 overflow-hidden bg-stone-950">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Harita İpucu Rozeti */}
        <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-none bg-stone-900/90 backdrop-blur-sm border border-stone-800 text-[11px] text-stone-300 px-2.5 py-1.5 rounded flex items-center gap-1.5 shadow-md">
          <Navigation className="w-3.5 h-3.5 text-amber-400" />
          <span>Dünya haritasında doğum yerinize tıklayarak pini yerleştirin</span>
        </div>

        {/* Yükleniyor / Çözümleniyor Göstergesi */}
        {isResolving && (
          <div className="absolute top-2.5 right-2.5 z-20 bg-stone-900/90 border border-amber-500/50 text-amber-300 text-xs px-3 py-1.5 rounded flex items-center gap-2 shadow">
            <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>Konum bilgisi alınıyor...</span>
          </div>
        )}
      </div>

      {/* Seçilen Konum ve Astrolojik Koordinat Kartı */}
      <div className="p-3.5 bg-stone-900/60 border border-stone-800/80 rounded-lg space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <Globe className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-stone-200 truncate">
                {value?.city ? `${value.city}, ${value.country}` : 'Seçilen Doğum Yeri'}
              </div>
              <div className="text-[11px] text-stone-400 truncate mt-0.5">
                {value?.placeName || 'Henüz bir konum seçilmedi'}
              </div>
            </div>
          </div>
        </div>

        {/* Astrolojik Hesaplama Altyapı Parametreleri */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-800/60 text-[11px]">
          <div>
            <span className="text-stone-500 block">Enlem</span>
            <span className="font-mono text-stone-300">
              {value?.latitude !== undefined ? `${value.latitude.toFixed(4)}°` : '-'}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block">Boylam</span>
            <span className="font-mono text-stone-300">
              {value?.longitude !== undefined ? `${value.longitude.toFixed(4)}°` : '-'}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block">Zaman Dilimi</span>
            <span className="font-mono text-stone-300 truncate block">
              {value?.timezone || 'Europe/Istanbul'}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block">UTC Farkı</span>
            <span className="font-mono text-amber-400">
              {value?.utcOffsetMinutes !== undefined
                ? `UTC${value.utcOffsetMinutes >= 0 ? '+' : ''}${(value.utcOffsetMinutes / 60).toFixed(0)} saat`
                : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Hata Mesajı */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
