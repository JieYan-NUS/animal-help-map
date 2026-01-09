"use client";

import { useEffect, useMemo, useState } from "react";
import { useMap } from "react-leaflet";
import dynamic from "next/dynamic";
import { derivePlaceLabel, formatReportTimestamp } from "@/lib/reportTime";
import { t, type Locale } from "@/lib/i18n";

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
  report_type?: "need_help" | "lost" | null;
  status?: string | null;
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
  report_tz?: string | null;
  report_utc_offset_minutes?: number | null;
  created_at?: string;
  reported_at?: string;
  reportedAt?: string;
  last_seen_at?: string | null;
  expires_at?: string | null;
  resolved_at?: string | null;
  lost_case_id?: string | null;
  photoUrl?: string | null;
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

const formatReportedAt = (report: Report, locale: Locale) => {
  const raw = report.created_at ?? report.reported_at ?? report.reportedAt;
  if (!raw) return null;
  const placeLabel = derivePlaceLabel(report.address, resolveLocationDescription(report));
  return formatReportTimestamp({
    timestamp: raw,
    timeZone: report.report_tz,
    utcOffsetMinutes: report.report_utc_offset_minutes ?? null,
    placeLabel,
    label: t(locale, "map.reported")
  });
};

const formatLastSeenAt = (report: Report, locale: Locale) => {
  if (!report.last_seen_at) return null;
  const placeLabel = derivePlaceLabel(report.address, resolveLocationDescription(report));
  return formatReportTimestamp({
    timestamp: report.last_seen_at,
    timeZone: report.report_tz,
    placeLabel,
    label: t(locale, "map.lastSeen")
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

const formatLostCaseId = (report: Report): string | null => {
  const value = report.lost_case_id?.trim();
  return value ? value : null;
};

const nearestAreaLabel = (report: Report): string => {
  const location = resolveLocationDescription(report);
  if (location) return location;
  if (isFiniteNumber(parseCoordinate(report.latitude)) && isFiniteNumber(parseCoordinate(report.longitude))) {
    return "Approximate area";
  }
  return "Area pending";
};

const resolveStatusBadge = (report: Report, locale: Locale) => {
  const status = report.status ?? "Reported";
  if (status === "Found" || status === "Resolved") {
    return {
      label: t(locale, "report.status.found"),
      style: { background: "#cfead6", color: "#165a2a" }
    };
  }
  if (status === "Cancelled") {
    return {
      label: t(locale, "map.cancelledBadge"),
      style: { background: "#e9e9e9", color: "#4d4d4d" }
    };
  }
  if (report.report_type === "lost") {
    return {
      label: t(locale, "map.lostBadge"),
      style: { background: "#ff6b6b", color: "#5a0d0d" }
    };
  }
  return {
    label: t(locale, "map.needHelpBadge"),
    style: { background: "#8ec5ff", color: "#0b3a63" }
  };
};

export default function MapClient({ locale }: { locale: Locale }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [markerIcons, setMarkerIcons] = useState<{
    default: any;
    latest: any;
    lost: any;
    lostLatest: any;
  } | null>(null);
  const activeReports = useMemo(
    () => reports.filter((report) => report.status === "Reported"),
    [reports]
  );
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

    return activeReports.slice().sort((a, b) => toTimestamp(b) - toTimestamp(a));
  }, [activeReports]);

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

      const lostIcon = L.divIcon({
        className: "lostMarkerIcon",
        html: `
          <div class="lost-marker" style="--marker-width:52px;--marker-height:68px;"></div>
        `,
        iconSize: [52, 68],
        iconAnchor: [26, 68],
        popupAnchor: [0, -56],
      });

      const lostLatestIcon = L.divIcon({
        className: "lostLatestMarkerIcon",
        html: `
          <div class="lost-marker lost-marker--latest" style="--marker-width:64px;--marker-height:84px;"></div>
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

      setMarkerIcons({
        default: defaultIcon,
        latest: latestIcon,
        lost: lostIcon,
        lostLatest: lostLatestIcon
      });
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
        setError(e?.message ?? t(locale, "map.loadError"));
      }
    })();
  }, [locale]);

  const center = useMemo<[number, number]>(() => [0, 0], []);
  const latestPoints = useMemo(
    () => pinned.map((report) => [report.latitude, report.longitude]) as [number, number][],
    [pinned]
  );
  const newestMissingCoords = all[0] ? !hasValidCoordinates(all[0]) : false;
  const hasActiveReports = activeReports.length > 0;

  return (
    <main className="page">
      <h1 className="title">{t(locale, "map.title")}</h1>
      <p className="subtitle">
        {t(locale, "map.subtitle")}
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
                color: "#6b4b2a"
              }}
            >
              {t(locale, "map.newestMissingCoords")}
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
                  icon={
                    (
                      isLatest
                        ? r.report_type === "lost"
                          ? markerIcons?.lostLatest
                          : markerIcons?.latest
                        : r.report_type === "lost"
                          ? markerIcons?.lost
                          : markerIcons?.default
                    ) ?? undefined
                  }
                >
                  <Popup>
                    {(() => {
                    const reportedAt = formatReportedAt(r, locale);
                    const lastSeenAt = formatLastSeenAt(r, locale);
                    const address = formatAddress(r);
                    const coordinates = formatCoordinates(r);
                    const locationDescription = resolveLocationDescription(r);
                    const isLost = r.report_type === "lost";
                    const statusBadge = resolveStatusBadge(r, locale);
                    const lostCaseId = formatLostCaseId(r);
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
                                {t(locale, "map.latestBadge")}
                              </span>
                            </div>
                          ) : null}
                          {statusBadge ? (
                            <div style={{ marginBottom: 6 }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  ...statusBadge.style,
                                  fontWeight: 700,
                                  fontSize: 11,
                                  letterSpacing: 0.4
                                }}
                              >
                                {statusBadge.label}
                              </span>
                            </div>
                          ) : null}
                        <strong>{r.species}</strong> — {r.condition}
                        {r.description ? <div style={{ marginTop: 6 }}>{r.description}</div> : null}
                        {isLost && lostCaseId ? (
                          <div style={{ marginTop: 6, fontWeight: 600 }}>
                            {t(locale, "report.lostCase.label")}: {lostCaseId}
                          </div>
                        ) : null}
                        {locationDescription ? (
                          <div style={{ marginTop: 6, opacity: 0.8 }}>{locationDescription}</div>
                        ) : null}
                        {isLost && r.photoUrl ? (
                          <div style={{ marginTop: 10 }}>
                            <img
                              src={r.photoUrl}
                              alt={`${t(locale, "map.lostPhotoAltPrefix")}${r.species}`}
                              style={{
                                width: "100%",
                                maxWidth: 220,
                                borderRadius: 10,
                                border: "1px solid #f1d0d0"
                              }}
                            />
                          </div>
                        ) : null}
                          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                            {reportedAt ? (
                              <>
                                <div>{reportedAt.reportedLabel}</div>
                              </>
                            ) : null}
                            {isLost && lastSeenAt ? (
                              <>
                                <div>{lastSeenAt.reportedLabel}</div>
                              </>
                            ) : null}
                            {!isLost ? (
                              <div>
                                {t(locale, "map.addressLabel")}: {address ?? t(locale, "map.addressPending")}
                              </div>
                            ) : null}
                            {!isLost && coordinates ? (
                              <div>
                                {t(locale, "map.coordinatesLabel")}: {coordinates}
                              </div>
                            ) : null}
                            <div>
                              {t(locale, "map.nearestAreaLabel")}: {nearestAreaLabel(r)}
                            </div>
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
          <h2 className="listTitle">{t(locale, "map.heading")}</h2>
          <ul className="list">
            {list.map((r, idx) => {
              const reportedAt = formatReportedAt(r, locale);
              const address = formatAddress(r);
              const coordinates = formatCoordinates(r);
              const isLost = r.report_type === "lost";
              const statusBadge = resolveStatusBadge(r, locale);
              const lostCaseId = formatLostCaseId(r);
              return (
                <li key={(r.id ?? `list-${idx}`).toString()} className="listItem">
                  <div>
                    <strong>{r.species}</strong> · {r.condition}
                    {statusBadge ? (
                      <span
                        style={{
                          marginLeft: 6,
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontWeight: 700,
                          fontSize: 11,
                          letterSpacing: 0.4,
                          ...statusBadge.style
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>
                    <div>
                      {isLost ? t(locale, "map.approximateArea") : address ?? t(locale, "map.addressPending")}
                    </div>
                    {isLost && lostCaseId ? (
                      <div>
                        {t(locale, "report.lostCase.label")}: {lostCaseId}
                      </div>
                    ) : null}
                    {reportedAt ? (
                      <>
                        <div>{reportedAt.reportedLabel}</div>
                      </>
                    ) : null}
                    {!isLost && coordinates ? <div>{coordinates}</div> : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {!hasActiveReports ? (
            <p style={{ marginTop: 16, color: "#6d6558" }}>{t(locale, "map.empty")}</p>
          ) : null}
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
