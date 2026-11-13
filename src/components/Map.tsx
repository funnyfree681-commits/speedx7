import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Crosshair, Layers, Plus, Minus, Lock, Globe } from 'lucide-react';
import {
  INDIA_BOUNDS,
  INDIAN_CITIES,
  IndianCity,
  getCityBounds,
  getCityViewbox,
} from '../data/indiaCities';
import { cn } from '../lib/utils';

interface MapProps {
  center: [number, number];
  zoom?: number;
  selectedCity?: IndianCity;
  pickup?: [number, number];
  dropoff?: [number, number];
  pickupLabel?: string;
  dropoffLabel?: string;
  drivers?: { id: string; lat: number; lng: number }[];
  showCityHubs?: boolean;
  onSelectHub?: (name: string, lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

interface SearchResult {
  name: string;
  lat: number;
  lng: number;
}

const pickupIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #16a34a; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(22, 163, 74, 0.5);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const dropoffIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #dc2626; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.5);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const driverIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #0f172a; width: 16px; height: 16px; border-radius: 4px; border: 2px solid white; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.4);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const hubIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #f97316; width: 11px; height: 11px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);"></div>`,
  iconSize: [11, 11],
  iconAnchor: [5, 5],
});

function ChangeView({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  const prevRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (
      !prev ||
      prev.lat !== center[0] ||
      prev.lng !== center[1] ||
      prev.zoom !== zoom
    ) {
      map.setView(center, zoom, { animate: true });
      prevRef.current = { lat: center[0], lng: center[1], zoom };
    }
  }, [center[0], center[1], zoom, map]);

  return null;
}

function CityBoundsController({
  selectedCity,
  lockToCity,
}: {
  selectedCity?: IndianCity;
  lockToCity: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedCity && lockToCity) {
      const bounds = getCityBounds(selectedCity);
      map.setMaxBounds(bounds);
      map.setMinZoom(10);
    } else {
      map.setMaxBounds(INDIA_BOUNDS);
      map.setMinZoom(4);
    }
  }, [selectedCity, lockToCity, map]);

  return null;
}

function MapEvents({
  onMapClick,
  onZoomChange,
}: {
  onMapClick?: (lat: number, lng: number) => void;
  onZoomChange: (z: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const handleZoom = () => onZoomChange(map.getZoom());
    map.on('zoomend', handleZoom);
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, onZoomChange]);

  useEffect(() => {
    if (!onMapClick) return;
    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [onMapClick, map]);

  return null;
}

function MapControlBridge({
  mapRef,
}: {
  mapRef: React.MutableRefObject<L.Map | null>;
}) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

const Map: React.FC<MapProps> = ({
  center,
  zoom = 13,
  selectedCity,
  pickup,
  dropoff,
  pickupLabel,
  dropoffLabel,
  drivers,
  showCityHubs = true,
  onSelectHub,
  onMapClick,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [layerMode, setLayerMode] = useState<'street' | 'satellite'>('street');
  const [lockToCity, setLockToCity] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setQuery('');
    setResults([]);
    setCurrentZoom(zoom);
  }, [selectedCity?.id, zoom]);

  const visibleHubs = useMemo(() => {
    if (!showCityHubs) return [];
    if (selectedCity) {
      return selectedCity.landmarks.map((lm) => ({
        cityId: selectedCity.id,
        cityName: selectedCity.name,
        state: selectedCity.state,
        ...lm,
      }));
    }
    return INDIAN_CITIES.flatMap((city) =>
      city.landmarks.map((lm) => ({
        cityId: city.id,
        cityName: city.name,
        state: city.state,
        ...lm,
      }))
    );
  }, [showCityHubs, selectedCity]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    const lower = trimmed.toLowerCase();
    const citiesToSearch = selectedCity ? [selectedCity] : INDIAN_CITIES;
    const localMatches: SearchResult[] = [];
    for (const city of citiesToSearch) {
      for (const lm of city.landmarks) {
        if (lm.name.toLowerCase().includes(lower)) {
          localMatches.push({
            name: `${lm.name} (${city.name})`,
            lat: lm.lat,
            lng: lm.lng,
          });
        }
      }
    }

    try {
      const searchQuery = selectedCity
        ? `${trimmed}, ${selectedCity.name}, ${selectedCity.state}`
        : trimmed;
      const viewboxParam = selectedCity
        ? `&viewbox=${encodeURIComponent(getCityViewbox(selectedCity))}&bounded=1`
        : '';
      const res = await fetch(
        `/api/geocode/search?q=${encodeURIComponent(searchQuery)}${viewboxParam}`
      );
      const data = await res.json();
      const remoteMatches: SearchResult[] = Array.isArray(data)
        ? data.map((item: any) => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          }))
        : [];
      const merged = [...remoteMatches, ...localMatches].slice(0, 6);
      setResults(merged);
      if (merged.length > 0 && mapRef.current) {
        mapRef.current.setView([merged[0].lat, merged[0].lng], 17, { animate: true });
      }
    } catch {
      setResults(localMatches.slice(0, 6));
      if (localMatches.length > 0 && mapRef.current) {
        mapRef.current.setView([localMatches[0].lat, localMatches[0].lng], 17, { animate: true });
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (item: SearchResult) => {
    setResults([]);
    setQuery(item.name.split(',')[0]);
    if (mapRef.current) {
      mapRef.current.setView([item.lat, item.lng], 18, { animate: true });
    }
    if (onSelectHub) {
      onSelectHub(item.name.split(',').slice(0, 2).join(','), item.lat, item.lng);
    }
  };

  const handleLocateMe = () => {
    if (!('geolocation' in navigator) || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const inIndia =
          latitude >= 6 && latitude <= 37 && longitude >= 67 && longitude <= 98;
        if (inIndia && mapRef.current && (!selectedCity || !lockToCity)) {
          mapRef.current.setView([latitude, longitude], 18, { animate: true });
        } else if (mapRef.current) {
          mapRef.current.setView(center, 17, { animate: true });
        }
      },
      () => {
        if (mapRef.current) {
          mapRef.current.setView(center, 17, { animate: true });
        }
      }
    );
  };

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border border-slate-200">
      {/* Top Overlay: City-Scoped Street Search & Layer Controls */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-col sm:flex-row sm:items-start justify-between gap-2 pointer-events-none">
        <div className="relative w-full sm:max-w-sm pointer-events-auto">
          <form
            onSubmit={handleSearch}
            className="flex items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden"
          >
            <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                selectedCity
                  ? `Search area, colony, gali in ${selectedCity.name}...`
                  : 'Search city, street, village, pincode...'
              }
              className="w-full px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-3 py-2 bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shrink-0"
            >
              {searching ? '...' : 'Find'}
            </button>
          </form>

          {results.length > 0 && (
            <div className="mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
              {results.map((item, idx) => (
                <button
                  key={`${item.lat}-${item.lng}-${idx}`}
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 block"
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto self-end sm:self-auto">
          {selectedCity && (
            <button
              type="button"
              onClick={() => setLockToCity((prev) => !prev)}
              className={cn(
                'px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-sm transition-colors inline-flex items-center gap-1',
                lockToCity
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              )}
              title="Toggle locking map pan to the selected city"
            >
              {lockToCity ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              <span>{lockToCity ? `${selectedCity.name} Only` : 'Free Pan'}</span>
            </button>
          )}

          <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setLayerMode('street')}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors inline-flex items-center gap-1',
                layerMode === 'street'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Layers className="w-3 h-3" />
              Street
            </button>
            <button
              type="button"
              onClick={() => setLayerMode('satellite')}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors',
                layerMode === 'satellite'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Satellite
            </button>
          </div>
        </div>
      </div>

      {/* Bottom-Left City Context Badge */}
      {selectedCity && (
        <div className="absolute bottom-4 left-3 z-[400] bg-white/95 border border-slate-300 rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-800 shadow-sm">
          {selectedCity.name} · {selectedCity.state}
        </div>
      )}

      {/* Bottom-Right Zoom & GPS Controls */}
      <div className="absolute bottom-4 right-3 z-[400] flex flex-col items-end gap-2">
        <div className="bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col overflow-hidden">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="p-2 text-slate-700 hover:bg-slate-100 border-b border-slate-200"
            title="Zoom in to street / building level"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="p-2 text-slate-700 hover:bg-slate-100 border-b border-slate-200"
            title="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleLocateMe}
            className="p-2 text-emerald-700 hover:bg-emerald-50"
            title="Zoom to city / GPS center"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-white/95 border border-slate-300 rounded-md px-2 py-1 text-[11px] font-mono tabular-nums text-slate-700 shadow-sm">
          Zoom {currentZoom}/21
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={selectedCity && lockToCity ? 10 : 4}
        maxZoom={21}
        scrollWheelZoom
        zoomControl={false}
        maxBounds={selectedCity && lockToCity ? getCityBounds(selectedCity) : INDIA_BOUNDS}
        maxBoundsViscosity={0.9}
        className="h-full w-full z-0"
      >
        {layerMode === 'street' ? (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={21}
            maxNativeZoom={19}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · India'
          />
        ) : (
          <>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={21}
              maxNativeZoom={18}
              attribution="Tiles &copy; Esri · India Satellite"
            />
            <TileLayer
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={21}
              maxNativeZoom={18}
            />
          </>
        )}

        <MapControlBridge mapRef={mapRef} />
        <ChangeView center={center} zoom={zoom} />
        <CityBoundsController selectedCity={selectedCity} lockToCity={lockToCity} />
        <MapEvents onMapClick={onMapClick} onZoomChange={setCurrentZoom} />

        {visibleHubs.map((lm) => (
          <Marker
            key={`${lm.cityId}-${lm.name}`}
            position={[lm.lat, lm.lng]}
            icon={hubIcon}
            eventHandlers={{
              click: () => {
                if (onSelectHub) onSelectHub(lm.name, lm.lat, lm.lng);
              },
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold text-slate-900">{lm.name}</p>
                <p className="text-slate-500">
                  {lm.cityName}, {lm.state}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {pickup && (
          <Marker position={pickup} icon={pickupIcon}>
            <Popup>{pickupLabel || 'Pickup Point'}</Popup>
          </Marker>
        )}

        {dropoff && (
          <Marker position={dropoff} icon={dropoffIcon}>
            <Popup>{dropoffLabel || 'Dropoff Point'}</Popup>
          </Marker>
        )}

        {pickup && dropoff && (
          <Polyline positions={[pickup, dropoff]} color="#16a34a" weight={3} dashArray="6, 8" />
        )}

        {drivers?.map((driver) => (
          <Marker key={driver.id} position={[driver.lat, driver.lng]} icon={driverIcon}>
            <Popup>Driver {driver.id}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default Map;
