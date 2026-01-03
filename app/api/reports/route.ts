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
