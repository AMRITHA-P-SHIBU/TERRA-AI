import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin } from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let mapsPromise;

function areaFromAddress(address) {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : 'Area provided';
}

function hasCoordinates(location) {
  return location?.lat != null && location?.lng != null
    && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng));
}

function loadGoogleMaps() {
  if (window.google?.maps?.places) return Promise.resolve(window.google.maps);
  if (!API_KEY) return Promise.reject(new Error('Map selection is not configured. You can still enter an address manually.'));
  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      const callbackName = `terraMapsReady${Date.now()}`;
      window[callbackName] = () => {
        delete window[callbackName];
        if (window.google?.maps?.places) resolve(window.google.maps);
        else reject(new Error('Google Maps loaded without the Places library.'));
      };
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&loading=async&libraries=places&callback=${callbackName}`;
      script.async = true;
      script.onerror = () => reject(new Error('Map selection is unavailable. You can still enter an address manually.'));
      document.head.appendChild(script);
    });
  }
  return mapsPromise;
}

function placeArea(place) {
  const components = place.address_components || [];
  const find = (type) => components.find((component) => component.types.includes(type))?.long_name;
  const addressParts = place.formatted_address?.split(',').map((part) => part.trim()).filter(Boolean) || [];
  return find('neighborhood') || find('sublocality_level_1') || find('locality')
    || find('administrative_area_level_2') || addressParts.at(-1) || '';
}

export default function LocationPicker({ value, onChange, required = true }) {
  const inputRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const [mapsError, setMapsError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  }, [onChange, value]);

  useEffect(() => {
    let active = true;
    let marker;
    let map;
    let autocomplete;
    let placeListener;
    loadGoogleMaps().then((maps) => {
      if (!active || !mapRef.current) return;
      const currentValue = valueRef.current;
      const currentHasCoordinates = hasCoordinates(currentValue);
      const center = currentHasCoordinates ? { lat: Number(currentValue.lat), lng: Number(currentValue.lng) } : { lat: 20.5937, lng: 78.9629 };
      map = new maps.Map(mapRef.current, { center, zoom: currentHasCoordinates ? 13 : 5, mapTypeControl: false, streetViewControl: false });
      marker = new maps.Marker({ map, position: currentHasCoordinates ? center : null, draggable: true });
      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
      setMapReady(true);
      marker.addListener('dragend', async () => {
        const point = marker.getPosition();
        if (!point) return;
        try {
          const result = await new maps.Geocoder().geocode({ location: { lat: point.lat(), lng: point.lng() } });
          const place = result.results?.[0];
          if (!place) throw new Error('Google Maps could not identify this pin location.');
          inputRef.current.value = place.formatted_address;
          onChangeRef.current({ lat: point.lat(), lng: point.lng(), address: place.formatted_address, area: placeArea(place) });
          setMapsError('');
        } catch (error) {
          setMapsError(`${error.message} You can still enter an address manually.`);
        }
      });
      autocomplete = new maps.places.Autocomplete(inputRef.current, { fields: ['geometry', 'formatted_address', 'address_components'] });
      placeListener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) {
          setMapsError('Map suggestions are unavailable for this address. You can enter it manually.');
          return;
        }
        const point = place.geometry.location;
        const next = {
          lat: point.lat(), lng: point.lng(), address: place.formatted_address,
          area: placeArea(place),
        };
        onChangeRef.current(next);
        marker.setPosition(point);
        map.setCenter(point);
        map.setZoom(14);
        setMapsError('');
      });
    }).catch((error) => {
      if (active) setMapsError(error.message);
    });
    return () => {
      active = false;
      if (placeListener) placeListener.remove();
      if (marker) mapsPromise?.then((maps) => maps.event.clearInstanceListeners(marker));
      if (map) mapsPromise?.then((maps) => maps.event.clearInstanceListeners(map));
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    };
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapsError('This browser does not support location access.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const maps = await loadGoogleMaps();
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        const result = await new maps.Geocoder().geocode({ location: point });
        const place = result.results?.[0];
        if (!place) throw new Error('Google Maps could not identify this location.');
        const address = place.formatted_address;
        inputRef.current.value = address;
        onChange({ ...point, address, area: placeArea(place) });
        markerInstanceRef.current?.setPosition(point);
        mapInstanceRef.current?.setCenter(point);
        mapInstanceRef.current?.setZoom(14);
      } catch (error) {
        setMapsError(error.message);
      } finally {
        setBusy(false);
      }
    }, (error) => {
      setMapsError(error.code === 1 ? 'Location permission was denied. Enter an address manually instead.' : 'Unable to retrieve your current location. Enter an address manually instead.');
      setBusy(false);
    }, { enableHighAccuracy: true, timeout: 12000 });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input ref={inputRef} required={required} minLength={3} maxLength={300} value={value?.address || ''} onChange={(event) => {
          const address = event.target.value;
          onChange({ lat: null, lng: null, address, area: areaFromAddress(address) });
          setMapsError('');
        }} placeholder="Enter a city, landmark, or address" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        {API_KEY && (
          <>
            <button type="button" onClick={useCurrentLocation} disabled={busy} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-50">
              <LocateFixed className="h-4 w-4" /> {busy ? 'Locating' : 'Use my location'}
            </button>
          </>
        )}
      </div>
      {API_KEY ? (
        <div className="space-y-1">
          <p className="text-xs text-slate-500">Optional: select or adjust a pin on the map. You can publish with the address alone.</p>
          <div className="relative">
            <div ref={mapRef} className="h-48 overflow-hidden rounded-xl border border-slate-200 bg-slate-100" aria-label="Optional location map" />
            {!mapReady && mapsError && <p role="status" className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-50 p-4 text-center text-sm text-amber-900">{mapsError}</p>}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Map selection is optional and currently unavailable. You can enter the address above.</p>
      )}
      {value?.address && <p className="flex items-center gap-1 text-xs text-slate-600"><MapPin className="h-3 w-3" />{value.address}</p>}
      {mapsError && mapReady && <p role="status" className="text-xs text-amber-800">{mapsError}</p>}
    </div>
  );
}
