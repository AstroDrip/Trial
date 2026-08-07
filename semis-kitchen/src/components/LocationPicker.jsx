import { useEffect, useRef, useState } from "react";
import { MapPin, LocateFixed, Loader2 } from "lucide-react";
import L from "leaflet";

/* Fix default marker icon path (Vite/Vercel bundling strips the images) */
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [10.8505, 76.2711]; // Kerala, India
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/* Reverse-geocode lat/lng -> readable address using free Nominatim API */
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) throw new Error("Geocode failed");
    const data = await res.json();
    return data?.display_name || "";
  } catch {
    return "";
  }
}

export default function LocationPicker({ value, onChange, initial = DEFAULT_CENTER }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapElRef = useRef(null);
  const [addr, setAddr] = useState(value?.address || "");
  const [locating, setLocating] = useState(false);

  // Apply external changes (e.g. "Use my location" reverse-geocoded after state set)
  useEffect(() => {
    if (value?.address) setAddr(value.address);
  }, [value?.address]);

  // Init map once
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const startLat = value?.lat ?? initial[0];
    const startLng = value?.lng ?? initial[1];

    const map = L.map(mapElRef.current, { center: [startLat, startLng], zoom: 14, attributionControl: true });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);

    const icon = L.icon({
      iconUrl: markerIcon,
      iconRetinaUrl: markerIcon2x,
      shadowUrl: markerShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const marker = L.marker([startLat, startLng], { icon, draggable: true }).addTo(map);

    const emit = async (latlng) => {
      const address = await reverseGeocode(latlng.lat, latlng.lng);
      setAddr(address);
      onChange({ lat: latlng.lat, lng: latlng.lng, address });
    };

    marker.on("dragend", (e) => emit(e.target.getLatLng()));
    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      emit(e.latlng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const address = await reverseGeocode(lat, lng);
        setAddr(address);
        onChange({ lat, lng, address });
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
        setLocating(false);
      },
      (err) => {
        alert(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. You can still drag the pin to your address."
            : "Could not get your location. Drag the pin on the map instead."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <div className="border border-green-800 bg-green-900/40">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-green-800">
        <div className="flex items-center gap-1.5 text-stone-200 text-sm font-medium">
          <MapPin className="w-4 h-4 text-amber-400" />
          Pin where to deliver
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-green-950 text-xs font-semibold hover:bg-amber-300 transition-colors disabled:opacity-60"
        >
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>

      <div ref={mapElRef} className="w-full h-64 md:h-72" />

      <div className="px-3.5 py-3 space-y-1.5">
        <label className="text-xs text-stone-400">Delivery address (auto-filled from pin)</label>
        <textarea
          value={addr}
          onChange={(e) => {
            setAddr(e.target.value);
            onChange({ ...(value || {}), address: e.target.value });
          }}
          rows={2}
          placeholder="Address appears here when you drop the pin or use your location. You can edit it."
          className="w-full bg-green-900/60 border border-green-800 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />
        {value?.lat != null && value?.lng != null && (
          <p className="text-[11px] text-stone-500 font-mono">
            Lat: {value.lat.toFixed(6)}, Lng: {value.lng.toFixed(6)}
          </p>
        )}
      </div>
    </div>
  );
}

