import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import tzLookup from "tz-lookup";
import { getUtcOffsetMinutes, isValidTimeZone } from "@/lib/timezone";
import { generateLostCaseId } from "@/lib/lostCaseId";

type ReportRequest = {
  report_type?: "need_help" | "lost";
  species: string;
  condition: string;
  description?: string;
  locationDescription: string;
  last_seen_at?: string;
  latitude?: string;
  longitude?: string;
  contact?: string;
};

type ReportRow = {
  id: string;
  report_type: string | null;
  species: string;
  condition: string;
  description: string | null;
  location_description: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  address: string | null;
  address_source: string | null;
  geocoded_at: string | null;
  report_tz: string | null;
  report_utc_offset_minutes: number | null;
  reporter_contact: string | null;
  status: string | null;
  last_seen_at: string | null;
  expires_at: string | null;
  resolved_at: string | null;
  photo_path: string | null;
  lost_case_id: string | null;
  created_at: string;
};

type ReportResponse = {
  id: string;
  report_type: string | null;
  species: string;
  condition: string;
  description: string | null;
  location_description: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  address: string | null;
  addressSource: string | null;
  geocodedAt: string | null;
  report_tz: string | null;
  report_utc_offset_minutes: number | null;
  contact: string | null;
  status: string | null;
  last_seen_at: string | null;
  expires_at: string | null;
  resolved_at: string | null;
  photoUrl: string | null;
  lost_case_id: string | null;
  created_at: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const isBlank = (value?: string) => !value || !value.trim();
const MAX_LOST_CASE_ATTEMPTS = 5;

const buildReportPhotoUrl = (path?: string | null) => {
  if (!path) return null;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return path;
  return `${baseUrl}/storage/v1/object/public/report-photos/${path}`;
};

const fetchReverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<{ address: string | null }> => {
  const token = process.env.MAPBOX_API_KEY;
  if (!token) return { address: null };

  const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&limit=1`;
  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      console.error("Mapbox reverse geocode error:", response.status);
      return { address: null };
    }
    const data = (await response.json()) as {
      features?: {
        place_name?: string;
      }[];
    };
    const placeName = data?.features?.[0]?.place_name;
    const address = placeName?.trim() ? placeName.trim() : null;
    return { address };
  } catch (error) {
    console.error("Mapbox reverse geocode crash:", error);
    return { address: null };
  }
};

const isLostCaseIdCollision = (error: { code?: string; message?: string; details?: string }) => {
  if (error?.code !== "23505") return false;
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return message.includes("lost_case_id");
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReportRequest;
    const reportType =
      body.report_type === "lost" || body.report_type === "need_help"
        ? body.report_type
        : "need_help";

    if (
      isBlank(body.species) ||
      (reportType !== "lost" && isBlank(body.condition)) ||
      isBlank(body.locationDescription)
    ) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (reportType === "lost" && isBlank(body.last_seen_at)) {
      return NextResponse.json(
        { error: "Missing last seen date/time." },
        { status: 400 }
      );
    }

    const latitudeInput = body.latitude?.trim();
    const longitudeInput = body.longitude?.trim();

    const latitude = latitudeInput ? Number(latitudeInput) : null;
    const longitude = longitudeInput ? Number(longitudeInput) : null;

    if (
      (latitudeInput && !Number.isFinite(latitude)) ||
      (longitudeInput && !Number.isFinite(longitude))
    ) {
      return NextResponse.json(
        { error: "Latitude/Longitude must be valid numbers." },
        { status: 400 }
      );
    }

    let address: string | null = null;
    let addressSource: string | null = null;
    let geocodedAt: string | null = null;
    let reportTimeZone: string | null = null;
    let reportUtcOffsetMinutes: number | null = null;

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      try {
        const resolved = tzLookup(latitude as number, longitude as number);
        if (resolved && isValidTimeZone(resolved)) {
          reportTimeZone = resolved;
          reportUtcOffsetMinutes = getUtcOffsetMinutes(new Date(), resolved);
        }
      } catch (error) {
        console.warn("Report timezone lookup failed:", error);
      }
      const geocodeResult = await fetchReverseGeocode(latitude as number, longitude as number);
      if (reportType !== "lost") {
        address = geocodeResult.address;
        if (address) {
          addressSource = "mapbox";
          geocodedAt = new Date().toISOString();
        }
      }
    }

    let lastSeenAt: string | null = null;
    if (reportType === "lost" && body.last_seen_at) {
      const parsed = new Date(body.last_seen_at);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid last seen date/time." },
          { status: 400 }
        );
      }
      lastSeenAt = parsed.toISOString();
    }

    const expiresAt =
      reportType === "lost"
        ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    let lostCaseId: string | null = null;
    let insertError: { message?: string } | null = null;
    for (let attempt = 0; attempt < MAX_LOST_CASE_ATTEMPTS; attempt += 1) {
      if (reportType === "lost") {
        lostCaseId = generateLostCaseId();
      }
      // IMPORTANT: match your DB column names here
      const { error } = await supabase.from("reports").insert([
        {
          report_type: reportType,
          lost_case_id: reportType === "lost" ? lostCaseId : null,
          species: body.species.trim(),
          condition: reportType === "lost" ? "Lost" : body.condition.trim(),
          description: body.description?.trim() || null,
          location_description: body.locationDescription.trim(),
          latitude,
          longitude,
          address,
          address_source: addressSource,
          geocoded_at: geocodedAt,
          report_tz: reportTimeZone,
          report_utc_offset_minutes: reportUtcOffsetMinutes,
          reporter_contact: body.contact?.trim() || null,
          status: "Reported",
          last_seen_at: lastSeenAt,
          expires_at: expiresAt
        },
      ]);

      if (!error) {
        insertError = null;
        break;
      }

      insertError = error;
      if (reportType !== "lost" || !isLostCaseIdCollision(error)) {
        break;
      }
    }

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("API crash:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select(
        "id, created_at, report_type, species, condition, description, location_description, latitude, longitude, address, address_source, geocoded_at, report_tz, report_utc_offset_minutes, reporter_contact, status, last_seen_at, expires_at, resolved_at, photo_path, lost_case_id"
      )
      .eq("status", "Reported")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = Date.now();
    const reports: ReportResponse[] =
      (data as ReportRow[] | null)
        ?.map((report) => {
          const isLost = report.report_type === "lost";
          return {
            id: report.id,
            report_type: report.report_type,
            species: report.species,
            condition: report.condition,
            description: report.description ?? null,
            location_description: report.location_description ?? null,
            latitude: report.latitude,
            longitude: report.longitude,
            address: isLost ? null : report.address ?? null,
            addressSource: isLost ? null : report.address_source ?? null,
            geocodedAt: isLost ? null : report.geocoded_at ?? null,
            report_tz: report.report_tz ?? null,
            report_utc_offset_minutes: report.report_utc_offset_minutes ?? null,
            contact: report.reporter_contact ?? null,
            status: report.status ?? null,
            last_seen_at: report.last_seen_at ?? null,
            expires_at: report.expires_at ?? null,
            resolved_at: report.resolved_at ?? null,
            photoUrl: buildReportPhotoUrl(report.photo_path),
            lost_case_id: report.lost_case_id ?? null,
            created_at: report.created_at
          };
        })
        ?.filter((report) => {
          const reportType = report.report_type ?? "need_help";
          if (report.status !== "Reported") return false;
          if (reportType !== "lost") return true;
          if (report.resolved_at) return false;
          if (!report.expires_at) return true;
          const expiresAt = Date.parse(report.expires_at);
          if (!Number.isFinite(expiresAt)) return true;
          return expiresAt > now;
        }) ?? [];

    return NextResponse.json(reports);
  } catch (err) {
    console.error("API crash:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
