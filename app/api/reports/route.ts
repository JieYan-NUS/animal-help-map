import { NextResponse } from "next/server";

import { createSupabaseClient } from "@/lib/supabaseClient";

type ReportRequest = {
  species: string;
  condition: string;
  description?: string;
  locationDescription: string;
  latitude?: string;
  longitude?: string;
  contact?: string;
};

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
        { error: "Latitude and longitude must be valid numbers." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("reports")
      .insert({
        species: body.species.trim(),
        condition: body.condition.trim(),
        description: body.description?.trim() || null,
        location_description: body.locationDescription.trim(),
        latitude,
        longitude,
        reporter_contact: body.contact?.trim() || null
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "We couldn't save the report right now." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    return NextResponse.json(
      { error: "We couldn't save the report right now." },
      { status: 500 }
    );
  }
}
