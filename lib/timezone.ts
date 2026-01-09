export const DEFAULT_TIME_ZONE = "UTC";

export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
};

export const formatDateTime = (date: Date, timeZone?: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  };
  if (timeZone) {
    options.timeZone = timeZone;
  }
  return new Intl.DateTimeFormat("en-GB", options).format(date);
};

export const getUtcOffsetMinutes = (date: Date, timeZone: string): number | null => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).formatToParts(date);
    const lookup = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);
    const year = lookup("year");
    const month = lookup("month");
    const day = lookup("day");
    const hour = lookup("hour");
    const minute = lookup("minute");
    const second = lookup("second");
    if ([year, month, day, hour, minute, second].some((value) => Number.isNaN(value))) {
      return null;
    }
    const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    return Math.round((asUtc - date.getTime()) / 60000);
  } catch {
    return null;
  }
};

export const formatUtcOffsetMinutes = (offsetMinutes: number): string => {
  if (!Number.isFinite(offsetMinutes)) return "UTC";
  if (offsetMinutes === 0) return "UTC";
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  if (minutes) {
    return `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
  }
  return `UTC${sign}${hours}`;
};
