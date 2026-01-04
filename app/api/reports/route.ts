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
  contact: string | null;
  created_at: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const isBlank = (value?: string) => !value || !value.trim();

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

    // IMPORTANT: match your DB column names here
    const { error } = await supabase.from("reports").insert([
      {
        species: body.species.trim(),
        condition: body.condition.trim(),
        description: body.description?.trim() || null,
        location_description: body.locationDescription.trim(),
        latitude,
        longitude,
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
        "id, created_at, species, condition, description, location_description, latitude, longitude, reporter_contact"
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
        latitude: report.latitude ?? null,
        longitude: report.longitude ?? null,
        contact: report.reporter_contact ?? null,
        created_at: report.created_at
      })
    ) ?? [];

    return NextResponse.json(reports);
  } catch (err) {
    console.error("API crash:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
