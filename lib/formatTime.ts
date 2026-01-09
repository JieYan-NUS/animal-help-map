type FormatTimeOptions = {
  timeZone?: string | null;
};

const formatBase = (date: Date, timeZone: string): string =>
  date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    timeZone
  });

export const formatTime = (isoTimestamp: string, options?: FormatTimeOptions): string | null => {
  if (!isoTimestamp) return null;
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return null;

  const timeZone = options?.timeZone?.trim();
  const fallbackZone = "UTC";

  if (timeZone) {
    try {
      return `${formatBase(date, timeZone)} (${timeZone})`;
    } catch {
      return `${formatBase(date, fallbackZone)} (${fallbackZone})`;
    }
  }

  return `${formatBase(date, fallbackZone)} (${fallbackZone})`;
};
