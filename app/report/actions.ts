"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { sanitizeFileName } from "@/lib/storyUtils";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

type ReportFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  reportId?: string;
  reportType?: "need_help" | "lost";
};

const isBlank = (value: string) => !value.trim();

const getString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const parseOptionalNumber = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const resolvePhotoUpload = async (file: File, reportId: string) => {
  const safeName = sanitizeFileName(file.name);
  const extension = safeName.includes(".") ? safeName.split(".").pop() : null;
  const filename = extension ? `photo.${extension}` : "photo";
  const path = `reports/${reportId}/${filename}`;

  const supabase = createSupabaseClient();
  const { error } = await supabase.storage
    .from("report-photos")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) {
    console.error("Report photo upload error:", error);
    return { error: error.message, path: null };
  }

  return { error: null, path };
};

const reverseGeocode = async (latitude: number, longitude: number) => {
  const token = process.env.MAPBOX_API_KEY;
  if (!token) return null;
  const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&limit=1`;
  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { features?: { place_name?: string }[] };
    const placeName = data?.features?.[0]?.place_name;
    return placeName?.trim() ? placeName.trim() : null;
  } catch (error) {
    console.error("Report reverse geocode error:", error);
    return null;
  }
};

export async function submitReport(
  _prevState: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const fieldErrors: Record<string, string> = {};
  const reportType = getString(formData, "report_type") || "need_help";
  const species = getString(formData, "species");
  const condition = getString(formData, "condition");
  const description = getString(formData, "description");
  const locationDescription = getString(formData, "location_description");
  const latitudeInput = getString(formData, "latitude");
  const longitudeInput = getString(formData, "longitude");
  const contact = getString(formData, "contact");
  const lastSeenInput = getString(formData, "last_seen_at");
  const photo = formData.get("photo");

  if (isBlank(species)) fieldErrors.species = "Please choose a species.";

  const isLost = reportType === "lost";
  if (!isLost && isBlank(condition)) {
    fieldErrors.condition = "Please choose the animal's condition.";
  }

  if (isBlank(locationDescription)) {
    fieldErrors.location_description = "Please share a brief location note.";
  }

  if (isLost && isBlank(description)) {
    fieldErrors.description = "Please add a short identifying description.";
  }

  if (isLost && isBlank(lastSeenInput)) {
    fieldErrors.last_seen_at = "Please add when the animal was last seen.";
  }

  if (isLost && isBlank(contact)) {
    fieldErrors.contact = "Please share a way to reach you.";
  }

  const latitude = parseOptionalNumber(latitudeInput);
  const longitude = parseOptionalNumber(longitudeInput);
  if (Number.isNaN(latitude)) {
    fieldErrors.latitude = "Latitude must be a valid number.";
  }
  if (Number.isNaN(longitude)) {
    fieldErrors.longitude = "Longitude must be a valid number.";
  }

  let lastSeenAt: string | null = null;
  if (lastSeenInput) {
    const parsedDate = new Date(lastSeenInput);
    if (Number.isNaN(parsedDate.getTime())) {
      fieldErrors.last_seen_at = "Please use a valid date and time.";
    } else {
      lastSeenAt = parsedDate.toISOString();
    }
  }

  let photoFile: File | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (!ALLOWED_MIME_TYPES.has(photo.type)) {
      fieldErrors.photo = "Only JPG, PNG, or WebP images are allowed.";
    } else if (photo.size > MAX_FILE_BYTES) {
      fieldErrors.photo = "Photo must be 5MB or smaller.";
    } else {
      photoFile = photo;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and try again.",
      fieldErrors,
      reportType: isLost ? "lost" : "need_help"
    };
  }

  const reportId = crypto.randomUUID();
  let photoPath: string | null = null;
  if (photoFile) {
    const uploadResult = await resolvePhotoUpload(photoFile, reportId);
    if (uploadResult.error) {
      return {
        status: "error",
        message: `We saved your report, but uploading the photo failed. ${uploadResult.error}`,
        reportType: isLost ? "lost" : "need_help"
      };
    }
    photoPath = uploadResult.path;
  }

  let address: string | null = null;
  let addressSource: string | null = null;
  let geocodedAt: string | null = null;

  if (!isLost && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    address = await reverseGeocode(latitude as number, longitude as number);
    if (address) {
      addressSource = "mapbox";
      geocodedAt = new Date().toISOString();
    }
  }

  const supabase = createSupabaseClient();
  const expiresAt = isLost
    ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from("reports").insert([
    {
      id: reportId,
      report_type: isLost ? "lost" : "need_help",
      species,
      condition: isLost ? "Lost" : condition,
      description: description || null,
      location_description: locationDescription,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      address,
      address_source: addressSource,
      geocoded_at: geocodedAt,
      reporter_contact: contact || null,
      status: "Reported",
      last_seen_at: isLost ? lastSeenAt : null,
      expires_at: expiresAt,
      photo_path: photoPath
    }
  ]);

  if (error) {
    console.error("Report insert error:", error);
    return {
      status: "error",
      message: `We couldn't save your report. ${error.message}`,
      reportType: isLost ? "lost" : "need_help"
    };
  }

  revalidatePath("/map");
  revalidatePath("/report");

  return {
    status: "success",
    message: "Thanks! Your report is in the queue.",
    reportId,
    reportType: isLost ? "lost" : "need_help"
  };
}

export async function resolveLostReport(
  _prevState: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const reportId = getString(formData, "report_id");
  const contact = getString(formData, "contact");

  if (isBlank(reportId) || isBlank(contact)) {
    return {
      status: "error",
      message: "Please provide the report ID and the contact used on the report."
    };
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, report_type, reporter_contact, resolved_at")
    .eq("id", reportId)
    .maybeSingle();

  if (error || !data) {
    return {
      status: "error",
      message: "We couldn't find that report."
    };
  }

  if (data.report_type !== "lost") {
    return {
      status: "error",
      message: "Only lost animal reports can be marked as found."
    };
  }

  if (data.resolved_at) {
    return {
      status: "success",
      message: "That report is already marked as found."
    };
  }

  const storedContact = data.reporter_contact?.trim() || "";
  if (!storedContact || storedContact !== contact) {
    return {
      status: "error",
      message: "The contact info doesn't match the report on file."
    };
  }

  const { error: updateError } = await supabase
    .from("reports")
    .update({
      resolved_at: new Date().toISOString(),
      status: "Resolved"
    })
    .eq("id", reportId);

  if (updateError) {
    console.error("Resolve report error:", updateError);
    return {
      status: "error",
      message: "We couldn't update that report. Please try again."
    };
  }

  revalidatePath("/map");
  revalidatePath("/report");

  return {
    status: "success",
    message: "Thanks! We've marked the report as found."
  };
}
