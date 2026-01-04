"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// Load react-leaflet components dynamically (client only)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

// IMPORTANT: leaflet itself must be imported only on client
let L: any = null;

type Report = {
  id?: string | number;
  species: string;
  condition: string;
  description?: string;
  locationDescription: string;
  latitude: number;
  longitude: number;
  created_at?: string;
};

export default function MapClient() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load leaflet only in browser
    (async () => {
      const leaflet = await import("leaflet");
      await import("leaflet.markercluster"); // attaches to leaflet
      L = leaflet.default ?? leaflet;
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/reports", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setReports(Array.isArray(data) ? data : data?.reports ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load reports");
      }
    })();
  }, []);

  const center = useMemo<[number, number]>(() => {
    // Default to Singapore
    return [1.3521, 103.8198];
  }, []);

  return (
    <main className="page">
      <h1 className="title">Animals on the Map</h1>
      <p className="subtitle">
        Reports appear as pins so you can see where help is needed and share with nearby helpers.
      </p>

      {error && <p className="errorText">{error}</p>}

      <div className="mapGrid">
        <div className="mapPanel">
          <MapContainer center={center} zoom={12} className="leafletMap">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {reports.map((r, idx) => (
              <Marker key={(r.id ?? idx).toString()} position={[r.latitude, r.longitude]}>
                <Popup>
                  <div style={{ minWidth: 220 }}>
                    <strong>{r.species}</strong> — {r.condition}
                    {r.description ? <div style={{ marginTop: 6 }}>{r.description}</div> : null}
                    <div style={{ marginTop: 6, opacity: 0.8 }}>{r.locationDescription}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <aside className="listPanel">
          <h2 className="listTitle">Latest reports</h2>
          <ul className="list">
            {reports.slice(0, 15).map((r, idx) => (
              <li key={(r.id ?? `list-${idx}`).toString()} className="listItem">
                <strong>{r.species}</strong> · {r.condition} · {r.locationDescription} ·{" "}
                {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
