import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google: any;
    __rmInitMap?: () => void;
    __rmMapReady?: Promise<void>;
  }
}

const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
  | string
  | undefined;
const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;

function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window.__rmMapReady) return window.__rmMapReady;
  window.__rmMapReady = new Promise<void>((resolve) => {
    window.__rmInitMap = () => resolve();
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key: BROWSER_KEY ?? "",
      loading: "async",
      callback: "__rmInitMap",
      libraries: "places,geometry",
      language: "pt-BR",
      region: "BR",
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    document.head.appendChild(s);
  });
  return window.__rmMapReady;
}

const darkStyle = [
  { elementType: "geometry", stylers: [{ color: "#1d1d1d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d1d1d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a2a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#808080" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3a3a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e0e0e" }] },
];

export type LatLng = { lat: number; lng: number };

export function RealMap({
  center,
  origin,
  destination,
  polyline,
  className = "",
}: {
  center?: LatLng;
  origin?: LatLng;
  destination?: LatLng;
  polyline?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polyRef = useRef<any>(null);

  const initialCenterRef = useRef(center);
  const lat = center?.lat;
  const lng = center?.lng;
  const originLat = origin?.lat;
  const originLng = origin?.lng;
  const destLat = destination?.lat;
  const destLng = destination?.lng;

  useEffect(() => {
    let cancelled = false;
    loadMaps().then(() => {
      if (cancelled || !ref.current || !window.google?.maps) return;
      if (!mapRef.current) {
        mapRef.current = new window.google.maps.Map(ref.current, {
          center: initialCenterRef.current ?? { lat: -23.5505, lng: -46.6333 },
          zoom: 14,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          styles: darkStyle,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // center
  useEffect(() => {
    if (mapRef.current && lat !== undefined && lng !== undefined) {
      mapRef.current.panTo({ lat, lng });
    }
  }, [lat, lng]);

  // markers & route
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (polyRef.current) polyRef.current.setMap(null);

    const g = window.google.maps;
    const originPos =
      originLat !== undefined && originLng !== undefined
        ? { lat: originLat, lng: originLng }
        : undefined;
    const destPos =
      destLat !== undefined && destLng !== undefined ? { lat: destLat, lng: destLng } : undefined;

    if (originPos) {
      markersRef.current.push(
        new g.Marker({
          position: originPos,
          map: mapRef.current,
          icon: {
            path: g.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#22c55e",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        }),
      );
    }
    if (destPos) {
      markersRef.current.push(
        new g.Marker({
          position: destPos,
          map: mapRef.current,
          icon: {
            path: g.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#FFC107",
            fillOpacity: 1,
            strokeColor: "#121212",
            strokeWeight: 2,
          },
        }),
      );
    }
    if (polyline && g.geometry?.encoding) {
      const path = g.geometry.encoding.decodePath(polyline);
      polyRef.current = new g.Polyline({
        path,
        map: mapRef.current,
        strokeColor: "#FFC107",
        strokeWeight: 5,
        strokeOpacity: 0.9,
      });
      const bounds = new g.LatLngBounds();
      path.forEach((p: any) => bounds.extend(p));
      mapRef.current.fitBounds(bounds, 80);
    } else if (originPos && destPos) {
      const bounds = new g.LatLngBounds();
      bounds.extend(originPos);
      bounds.extend(destPos);
      mapRef.current.fitBounds(bounds, 80);
    }
  }, [originLat, originLng, destLat, destLng, polyline]);

  if (!BROWSER_KEY) {
    return (
      <div className={`rm-map grid place-items-center text-xs text-muted-foreground ${className}`}>
        Configure o conector Google Maps Platform
      </div>
    );
  }
  return <div ref={ref} className={`rm-map ${className}`} />;
}
