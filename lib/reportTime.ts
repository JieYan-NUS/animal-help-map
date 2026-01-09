import {
  DEFAULT_TIME_ZONE,
  formatDateTime,
  formatUtcOffsetMinutes,
  getUtcOffsetMinutes,
  isValidTimeZone
} from "@/lib/timezone";

type ReportTimeInput = {
  timestamp: string;
  timeZone?: string | null;
  utcOffsetMinutes?: number | null;
  placeLabel?: string | null;
  label?: string | null;
};

export type ReportTimeLines = {
  reportedLabel: string;
};

const pickPlaceFromAddress = (address: string): string | null => {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const candidates = parts.length > 1 ? parts.slice(0, -1) : parts;
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const cleaned = candidates[i].replace(/[0-9]/g, "").replace(/\s{2,}/g, " ").trim();
    if (cleaned) return cleaned;
  }
  return parts[0] ?? null;
};

export const derivePlaceLabel = (address?: string | null, locationDescription?: string | null): string | null => {
  const trimmedAddress = address?.trim();
  if (trimmedAddress) {
    return pickPlaceFromAddress(trimmedAddress) ?? trimmedAddress;
  }
  const trimmedLocation = locationDescription?.trim();
  return trimmedLocation || null;
};

export const formatReportTimestamp = (input: ReportTimeInput): ReportTimeLines | null => {
  if (!input.timestamp) return null;
  const date = new Date(input.timestamp);
  if (Number.isNaN(date.getTime())) return null;

  const requestedTimeZone = input.timeZone?.trim() ?? "";
  const hasValidTimeZone = Boolean(requestedTimeZone) && isValidTimeZone(requestedTimeZone);
  const labelPrefix = input.label?.trim() || "Reported";

  if (!hasValidTimeZone) {
    const reportedLineLocal = formatDateTime(date);
    return { reportedLabel: `${labelPrefix} (Your local time): ${reportedLineLocal}` };
  }

  const timeZone = requestedTimeZone;
  const reportedLine1 = formatDateTime(date, timeZone);
  const offsetMinutes = Number.isFinite(input.utcOffsetMinutes ?? NaN)
    ? (input.utcOffsetMinutes as number)
    : getUtcOffsetMinutes(date, timeZone);
  const offsetLabel =
    offsetMinutes == null ? DEFAULT_TIME_ZONE : formatUtcOffsetMinutes(offsetMinutes);
  const placeLabel = input.placeLabel?.trim();
  const contextLabel = placeLabel
    ? `${placeLabel}, ${offsetLabel}`
    : `Local time, ${offsetLabel}`;
  return { reportedLabel: `${labelPrefix} (${contextLabel}): ${reportedLine1}` };
};
