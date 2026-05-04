import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix iconos de Leaflet con bundlers (Vite)
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

interface PickerMapProps {
  lat: number;
  lng: number;
  radiusM: number;
  onPick: (lat: number, lng: number) => void;
  height?: number;
}

export function PickerMap({ lat, lng, radiusM, onPick, height = 280 }: PickerMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView([lat, lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    const circle = L.circle([lat, lng], { radius: radiusM, color: "var(--primary, #6366f1)" }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      circle.setLatLng(p);
      onPick(p.lat, p.lng);
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      circle.setLatLng(e.latlng);
      onPick(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync radio
  useEffect(() => {
    circleRef.current?.setRadius(radiusM);
  }, [radiusM]);

  // Sync coords externas
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !circleRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    circleRef.current.setLatLng([lat, lng]);
  }, [lat, lng]);

  return <div ref={ref} style={{ height, width: "100%", borderRadius: 12, overflow: "hidden" }} />;
}
