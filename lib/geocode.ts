import "server-only";

type MapboxFeature = {
  place_name?: string;
  properties?: {
    full_address?: string;
    place_formatted?: string;
    timezone?: string;
    time_zone?: string;
  };
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

type ReverseGeocodeResult = {
  addressText: string | null;
  timeZone: string | null;
  requestUrl: string;
  status: number | null;
  ok: boolean;
};

const extractAddressFromFeature = (feature?: MapboxFeature) => {
  const placeName = feature?.place_name?.trim();
  if (placeName) {
    return placeName;
  }
  const fullAddress = feature?.properties?.full_address?.trim();
  if (fullAddress) {
    return fullAddress;
  }
  const formatted = feature?.properties?.place_formatted?.trim();
  if (formatted) {
    return formatted;
  }
  return null;
};

const extractTimeZoneFromFeature = (feature?: MapboxFeature) => {
  const timezone = feature?.properties?.timezone?.trim();
  if (timezone) return timezone;
  const timeZoneAlt = feature?.properties?.time_zone?.trim();
  if (timeZoneAlt) return timeZoneAlt;
  return null;
};

export const reverseGeocodeWithMapbox = async ({
  latitude,
  longitude
}: {
  latitude: number;
  longitude: number;
}): Promise<ReverseGeocodeResult> => {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing MAPBOX_ACCESS_TOKEN.");
  }

  const requestUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&limit=1`;
  let response: Response;
  try {
    response = await fetch(requestUrl, { cache: "no-store" });
  } catch {
    return { addressText: null, timeZone: null, requestUrl, status: null, ok: false };
  }

  if (!response.ok) {
    return {
      addressText: null,
      timeZone: null,
      requestUrl,
      status: response.status,
      ok: false
    };
  }

  const data = (await response.json()) as MapboxResponse;
  const feature = data?.features?.[0];
  const addressText = extractAddressFromFeature(feature);
  const timeZone = extractTimeZoneFromFeature(feature);
  return { addressText, timeZone, requestUrl, status: response.status, ok: true };
};
