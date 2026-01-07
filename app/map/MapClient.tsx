"use client";

import { useEffect, useMemo, useState } from "react";
import { useMap } from "react-leaflet";
import dynamic from "next/dynamic";
import { formatTime } from "@/lib/formatTime";

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
  locationDescription?: string | null;
  location_description?: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  address?: string | null;
  addressSource?: string | null;
  geocodedAt?: string | null;
  created_at?: string;
  reported_at?: string;
  reportedAt?: string;
};

type ValidReport = Report & {
  latitude: number;
  longitude: number;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const parseCoordinate = (value: number | string | null | undefined): number | null => {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return Number.isFinite(value) ? value : null;
};

const hasValidCoordinates = (report: Report): report is ValidReport => {
  const latitude = parseCoordinate(report.latitude);
  const longitude = parseCoordinate(report.longitude);
  return latitude != null && longitude != null;
};

const formatReportedAt = (report: Report): string | null => {
  const raw = report.created_at ?? report.reported_at ?? report.reportedAt;
  if (!raw) return null;
  return formatTime(raw, {
    latitude: report.latitude,
    longitude: report.longitude,
    preferSingapore: true
  });
};

const resolveLocationDescription = (report: Report): string | null => {
  const location = report.locationDescription ?? report.location_description;
  return location?.trim() || null;
};

const formatAddress = (report: Report): string | null => {
  const address = report.address?.trim();
  if (address) return address;
  return null;
};

const formatCoordinates = (report: Report): string | null => {
  const latitude = parseCoordinate(report.latitude);
  const longitude = parseCoordinate(report.longitude);
  if (latitude == null || longitude == null) return null;
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

const nearestAreaLabel = (report: Report): string => {
  const location = resolveLocationDescription(report);
  if (location) return location;
  if (isFiniteNumber(parseCoordinate(report.latitude)) && isFiniteNumber(parseCoordinate(report.longitude))) {
    return "Approximate area";
  }
  return "Area pending";
};

export default function MapClient() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [markerIcons, setMarkerIcons] = useState<{ default: any; latest: any } | null>(null);
  const all = useMemo(() => {
    const toTimestamp = (report: Report) => {
      const raw = report.created_at ?? report.reported_at ?? report.reportedAt;
      if (raw) {
        const ts = new Date(raw).getTime();
        if (Number.isFinite(ts)) return ts;
      }
      if (typeof report.id === "number" && Number.isFinite(report.id)) return report.id;
      if (typeof report.id === "string") {
        const parsed = Number(report.id);
        if (Number.isFinite(parsed)) return parsed;
      }
      return 0;
    };

    return reports.slice().sort((a, b) => toTimestamp(b) - toTimestamp(a));
  }, [reports]);

  const mappable = useMemo(
    () =>
      all
        .map((report) => {
          const latitude = parseCoordinate(report.latitude);
          const longitude = parseCoordinate(report.longitude);
          if (latitude == null || longitude == null) {
            return null;
          }
          return { ...report, latitude, longitude };
        })
        .filter((report): report is ValidReport => Boolean(report)),
    [all]
  );
  const pinned = useMemo(() => mappable.slice(0, 5), [mappable]);
  const pinnedLatestId = pinned[0]?.id;
  const list = useMemo(() => all.slice(0, 10), [all]);

  useEffect(() => {
    // Load leaflet only in browser
    (async () => {
      const leaflet = await import("leaflet");
      await import("leaflet.markercluster"); // attaches to leaflet
      L = leaflet.default ?? leaflet;

      const defaultIcon = L.icon({
        iconUrl: "/paw-heart-marker.svg",
        iconRetinaUrl: "/paw-heart-marker.svg",
        iconSize: [52, 68],
        iconAnchor: [26, 68],
        popupAnchor: [0, -56],
      });

      const latestIcon = L.divIcon({
        className: "latestMarkerIcon",
        html: `
          <div style="width:64px;height:84px;display:flex;align-items:center;justify-content:center;">
            <div style="width:64px;height:84px;background:url('/paw-heart-marker.svg') no-repeat center/contain;filter:drop-shadow(0 0 6px rgba(245,197,66,0.9)) drop-shadow(0 0 14px rgba(245,197,66,0.8));"></div>
          </div>
        `,
        iconSize: [64, 84],
        iconAnchor: [32, 84],
        popupAnchor: [0, -70],
      });

      L.Marker.prototype.options.icon = defaultIcon;
      if (L.MarkerClusterGroup?.prototype?.options) {
        L.MarkerClusterGroup.prototype.options.iconCreateFunction = (cluster: any) =>
          L.divIcon({
            className: "pawClusterIcon",
            html: `
              <div style="position:relative;width:58px;height:58px;display:flex;align-items:center;justify-content:center;background:url('/paw-heart-marker.svg') no-repeat center/contain;">
                <span style="color:#fff;font-weight:800;font-size:16px;text-shadow:0 1px 2px rgba(0,0,0,0.7);">
                  ${cluster.getChildCount()}
                </span>
              </div>
            `,
            iconSize: [58, 58],
            iconAnchor: [29, 58],
          });
      }

      setMarkerIcons({ default: defaultIcon, latest: latestIcon });
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

  const center = useMemo<[number, number]>(() => [0, 0], []);
  const latestPoints = useMemo(
    () => pinned.map((report) => [report.latitude, report.longitude]) as [number, number][],
    [pinned]
  );
  const newestMissingCoords = all[0] ? !hasValidCoordinates(all[0]) : false;

  return (
    <main className="page">
      <h1 className="title">Animals on the Map</h1>
      <p className="subtitle">
        Reports appear as pins so you can see where help is needed and share with nearby helpers.
      </p>

      {error && <p className="errorText">{error}</p>}

      <div className="mapGrid">
        <div className="mapPanel" style={{ height: 520, width: "100%" }}>
          {newestMissingCoords ? (
            <p
              style={{
                margin: "0 0 0.8rem",
                padding: "0.55rem 0.85rem",
                background: "#fff4e6",
                border: "1px dashed #eadbc8",
                borderRadius: 10,
                fontSize: "0.9rem",
                color: "#6b4b2a",
              }}
            >
              Newest report is missing coordinates and can't be pinned yet.
            </p>
          ) : null}
          <MapContainer center={center} zoom={2} className="leafletMap" style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitToBounds points={latestPoints} />
            {pinned.map((r, idx) => {
              const isLatest = pinnedLatestId ? r.id === pinnedLatestId : idx === 0;
              return (
                <Marker
                  key={(r.id ?? idx).toString()}
                  position={[r.latitude, r.longitude]}
                  icon={(isLatest ? markerIcons?.latest : markerIcons?.default) ?? undefined}
                >
                  <Popup>
                    {(() => {
                    const reportedAt = formatReportedAt(r);
                    const address = formatAddress(r);
                    const coordinates = formatCoordinates(r);
                    const locationDescription = resolveLocationDescription(r);
                    return (
                      <div style={{ minWidth: 220 }}>
                          {isLatest ? (
                            <div style={{ marginBottom: 6 }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: "#f7d26a",
                                  color: "#5d3b00",
                                  fontWeight: 700,
                                  fontSize: 11,
                                  letterSpacing: 0.4,
                                }}
                              >
                                Latest report
                              </span>
                            </div>
                          ) : null}
                        <strong>{r.species}</strong> — {r.condition}
                        {r.description ? <div style={{ marginTop: 6 }}>{r.description}</div> : null}
                        {locationDescription ? (
                          <div style={{ marginTop: 6, opacity: 0.8 }}>{locationDescription}</div>
                        ) : null}
                          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                            {reportedAt ? <div>Reported: {reportedAt}</div> : null}
                            <div>Address: {address ?? "Address pending"}</div>
                            {coordinates ? <div>Coordinates: {coordinates}</div> : null}
                            <div>Nearest area: {nearestAreaLabel(r)}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        <aside className="listPanel">
          <h2 className="listTitle">Latest reports</h2>
          <ul className="list">
            {list.map((r, idx) => {
              const reportedAt = formatReportedAt(r);
              const address = formatAddress(r);
              const coordinates = formatCoordinates(r);
              return (
                <li key={(r.id ?? `list-${idx}`).toString()} className="listItem">
                  <div>
                    <strong>{r.species}</strong> · {r.condition}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>
                    {address ?? "Address pending"}
                    {reportedAt ? ` · ${reportedAt}` : ""}
                    {coordinates ? ` · ${coordinates}` : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </main>
  );
}

function FitToBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(points, { padding: [40, 40] });
  }, [map, points]);

  return null;
}
