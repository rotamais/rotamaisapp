import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type LatLng = { lat: number; lng: number };

// Dark tile layer via CartoDB (free, no key required)
const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function circleIcon(color: string, ring: string) {
  return L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid ${ring};box-shadow:0 0 0 2px rgba(0,0,0,.35)"></div>`,
  });
}

export function RealMap({
  center,
  origin,
  destination,
  routeCoords,
  className = "",
}: {
  center?: LatLng;
  origin?: LatLng;
  destination?: LatLng;
  routeCoords?: [number, number][]; // [lat, lng]
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const lineRef = useRef<L.Polyline | null>(null);
  const initialCenterRef = useRef(center);

  const lat = center?.lat;
  const lng = center?.lng;
  const oLat = origin?.lat;
  const oLng = origin?.lng;
  const dLat = destination?.lat;
  const dLng = destination?.lng;
  const routeKey = routeCoords ? `${routeCoords.length}:${routeCoords[0]?.join(",")}` : "";

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const start = initialCenterRef.current ?? { lat: -23.5505, lng: -46.6333 };
    const map = L.map(ref.current, {
      center: [start.lat, start.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 20 }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && lat !== undefined && lng !== undefined) {
      mapRef.current.panTo([lat, lng]);
    }
  }, [lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (lineRef.current) {
      lineRef.current.remove();
      lineRef.current = null;
    }

    if (oLat !== undefined && oLng !== undefined) {
      markersRef.current.push(
        L.marker([oLat, oLng], { icon: circleIcon("#22c55e", "#fff") }).addTo(map),
      );
    }
    if (dLat !== undefined && dLng !== undefined) {
      markersRef.current.push(
        L.marker([dLat, dLng], { icon: circleIcon("#FFC107", "#121212") }).addTo(map),
      );
    }
    if (routeCoords && routeCoords.length > 1) {
      lineRef.current = L.polyline(routeCoords, {
        color: "#FFC107",
        weight: 5,
        opacity: 0.9,
      }).addTo(map);
      map.fitBounds(lineRef.current.getBounds(), { padding: [60, 60] });
    } else if (
      oLat !== undefined &&
      oLng !== undefined &&
      dLat !== undefined &&
      dLng !== undefined
    ) {
      map.fitBounds(
        L.latLngBounds([oLat, oLng], [dLat, dLng]),
        { padding: [60, 60] },
      );
    }
  }, [oLat, oLng, dLat, dLng, routeKey, routeCoords]);

  return <div ref={ref} className={`rm-map ${className}`} />;
}
