import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ReportRequest = {
  species: string;
  condition: string;
  description?: string;
  locationDescription: string;
  latitude?: string;
  longitude?: string;
  contact?: string;
};

type ReportRow = {
  id: string;
  species: string;
  condition: string;
  description: string | null;
  location_description: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  address: string | null;
  address_source: string | null;
  geocoded_at: string | null;
  reporter_contact: string | null;
  created_at: string;
};

type ReportResponse = {
  id: string;
  species: string;
  condition: string;
  description: string | null;
  location_description: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  address: string | null;
  addressSource: string | null;
  geocodedAt: string | null;
  contact: string | null;
  created_at: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const isBlank = (value?: string) => !value || !value.trim();

const fetchReverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  const token = process.env.MAPBOX_API_KEY;
  if (!token) return null;

  const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&limit=1`;
  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      console.error("Mapbox reverse geocode error:", response.status);
      return null;
    }
    const data = (await response.json()) as { features?: { place_name?: string }[] };
    const placeName = data?.features?.[0]?.place_name;
    return placeName?.trim() ? placeName.trim() : null;
  } catch (error) {
    console.error("Mapbox reverse geocode crash:", error);
    return null;
  }
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReportRequest;

    if (
      isBlank(body.species) ||
      isBlank(body.condition) ||
      isBlank(body.locationDescription)
    ) {
      return NextResponse.json(
        { error: "Missing required fields." },
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

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      address = await fetchReverseGeocode(latitude as number, longitude as number);
      if (address) {
        addressSource = "mapbox";
        geocodedAt = new Date().toISOString();
      }
    }

    // IMPORTANT: match your DB column names here
    const { error } = await supabase.from("reports").insert([
      {
        species: body.species.trim(),
        condition: body.condition.trim(),
        description: body.description?.trim() || null,
        location_description: body.locationDescription.trim(),
        latitude,
        longitude,
        address,
        address_source: addressSource,
        geocoded_at: geocodedAt,
        reporter_contact: body.contact?.trim() || null,
        status: "Reported",
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
        "id, created_at, species, condition, description, location_description, latitude, longitude, address, address_source, geocoded_at, reporter_contact"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const reports: ReportResponse[] = (data as ReportRow[] | null)?.map(
      (report) => ({
        id: report.id,
        species: report.species,
        condition: report.condition,
        description: report.description ?? null,
        location_description: report.location_description ?? null,
        latitude: report.latitude,
        longitude: report.longitude,
        address: report.address ?? null,
        addressSource: report.address_source ?? null,
        geocodedAt: report.geocoded_at ?? null,
        contact: report.reporter_contact ?? null,
        created_at: report.created_at,
      })
    ) ?? [];

    return NextResponse.json(reports);
  } catch (err) {
    console.error("API crash:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
