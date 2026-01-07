type FormatTimeOptions = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  preferSingapore?: boolean;
};

const SINGAPORE_BOUNDS = {
  minLat: 1.15,
  maxLat: 1.47,
  minLng: 103.6,
  maxLng: 104.1
};

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

const isWithinSingapore = (latitude: number | null, longitude: number | null): boolean => {
  if (latitude == null || longitude == null) return false;
  return (
    latitude >= SINGAPORE_BOUNDS.minLat &&
    latitude <= SINGAPORE_BOUNDS.maxLat &&
    longitude >= SINGAPORE_BOUNDS.minLng &&
    longitude <= SINGAPORE_BOUNDS.maxLng
  );
};

const formatBase = (date: Date, timeZone?: string): string =>
  date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {})
  });

const getLocalTimeZoneLabel = (date: Date): string => {
  const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(date);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "UTC";
};

export const formatTime = (isoTimestamp: string, options?: FormatTimeOptions): string | null => {
  if (!isoTimestamp) return null;
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return null;

  const latitude = parseCoordinate(options?.latitude);
  const longitude = parseCoordinate(options?.longitude);
  const useSingapore = Boolean(options?.preferSingapore) || isWithinSingapore(latitude, longitude);

  if (useSingapore) {
    return `${formatBase(date, "Asia/Singapore")} (SGT)`;
  }

  return `${formatBase(date)} (${getLocalTimeZoneLabel(date)})`;
};
