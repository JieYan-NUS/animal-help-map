"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { sanitizeFileName } from "@/lib/storyUtils";
import { reverseGeocodeWithMapbox } from "@/lib/geocode";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import tzLookup from "tz-lookup";
import { getUtcOffsetMinutes, isValidTimeZone } from "@/lib/timezone";
import { isLocale, t } from "@/lib/i18n";
import {
  generateLostCaseId,
  isLostCaseIdFormat,
  normalizeLostCaseId
} from "@/lib/lostCaseId";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);
const MAX_LOST_CASE_ATTEMPTS = 5;

type ReportFormState = {
  status: "idle" | "error" | "success";
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  reportId?: string;
  lostCaseId?: string | null;
  reportType?: "need_help" | "lost";
  errorCode?: "not_found" | "mismatch" | "already_resolved" | "invalid_code" | "not_lost";
};

type CancelReportState = {
  ok: boolean | null;
  error?: "not_found" | "mismatch" | "already_resolved";
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
  const timestamp = Date.now();
  const filename = `${timestamp}-${safeName}`;
  const path = `reports/${reportId}/${filename}`;

  const supabase = createSupabaseClient();
  const { error } = await supabase.storage
    .from("report-photos")
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error("Report photo upload error:", error);
    return { error: error.message, path: null };
  }

  return { error: null, path };
};

const isLostCaseIdCollision = (error: { code?: string; message?: string; details?: string }) => {
  if (error?.code !== "23505") return false;
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return message.includes("lost_case_id");
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function submitReport(
  _prevState: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const localeInput = getString(formData, "locale");
  const locale = isLocale(localeInput) ? localeInput : "en";
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

  if (isBlank(species)) fieldErrors.species = t(locale, "report.error.speciesRequired");

  const isLost = reportType === "lost";
  if (!isLost && isBlank(condition)) {
    fieldErrors.condition = t(locale, "report.error.conditionRequired");
  }

  if (isBlank(locationDescription)) {
    fieldErrors.location_description = t(locale, "report.error.locationRequired");
  }

  if (isLost && isBlank(description)) {
    fieldErrors.description = t(locale, "report.error.descriptionRequired");
  }

  if (isLost && isBlank(lastSeenInput)) {
    fieldErrors.last_seen_at = t(locale, "report.error.lastSeenRequired");
  }

  if (isLost && isBlank(contact)) {
    fieldErrors.contact = t(locale, "report.error.contactRequired");
  }

  const latitude = parseOptionalNumber(latitudeInput);
  const longitude = parseOptionalNumber(longitudeInput);
  if (Number.isNaN(latitude)) {
    fieldErrors.latitude = t(locale, "report.error.latitudeInvalid");
  }
  if (Number.isNaN(longitude)) {
    fieldErrors.longitude = t(locale, "report.error.longitudeInvalid");
  }

  let lastSeenAt: string | null = null;
  if (lastSeenInput) {
    const parsedDate = new Date(lastSeenInput);
    if (Number.isNaN(parsedDate.getTime())) {
      fieldErrors.last_seen_at = t(locale, "report.error.lastSeenInvalid");
    } else {
      lastSeenAt = parsedDate.toISOString();
    }
  }

  let photoFile: File | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (!ALLOWED_MIME_TYPES.has(photo.type)) {
      fieldErrors.photo = t(locale, "report.error.photoType");
    } else if (photo.size > MAX_FILE_BYTES) {
      fieldErrors.photo = t(locale, "report.error.photoSize");
    } else {
      photoFile = photo;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: t(locale, "report.error.fixFields"),
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
        message: `${t(locale, "report.error.photoUploadFailed")} ${uploadResult.error}`,
        reportType: isLost ? "lost" : "need_help"
      };
    }
    photoPath = uploadResult.path;
  }

  const supabase = createSupabaseClient();
  const expiresAt = isLost
    ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const reportTimestamp = new Date();
  let reportTimeZone: string | null = null;
  let reportUtcOffsetMinutes: number | null = null;

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    try {
      const resolved = tzLookup(latitude as number, longitude as number);
      if (resolved && isValidTimeZone(resolved)) {
        reportTimeZone = resolved;
        reportUtcOffsetMinutes = getUtcOffsetMinutes(reportTimestamp, resolved);
      }
    } catch (error) {
      console.warn("Report timezone lookup failed:", error);
    }
  }

  let lostCaseId: string | null = null;
  let insertError: { message?: string } | null = null;
  for (let attempt = 0; attempt < MAX_LOST_CASE_ATTEMPTS; attempt += 1) {
    // Sanity check: only retry when we hit a lost_case_id unique collision.
    if (isLost) {
      lostCaseId = generateLostCaseId();
    }

    const { error } = await supabase.from("reports").insert([
      {
        id: reportId,
        report_type: isLost ? "lost" : "need_help",
        lost_case_id: isLost ? lostCaseId : null,
        species,
        condition: isLost ? "Lost" : condition,
        description: description || null,
        location_description: locationDescription,
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
        address: null,
        address_source: null,
        geocoded_at: null,
        report_tz: reportTimeZone,
        report_utc_offset_minutes: reportUtcOffsetMinutes,
        reporter_contact: contact || null,
        status: "Reported",
        last_seen_at: isLost ? lastSeenAt : null,
        expires_at: expiresAt,
        photo_path: photoPath
      }
    ]);

    if (!error) {
      insertError = null;
      break;
    }

    insertError = error;
    if (!isLost || !isLostCaseIdCollision(error)) {
      break;
    }
  }

  if (insertError) {
    console.error("Report insert error:", insertError);
    return {
      status: "error",
      message: `${t(locale, "report.error.saveFailed")} ${insertError.message ?? ""}`.trim(),
      reportType: isLost ? "lost" : "need_help"
    };
  }

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    try {
      const { addressText, status, ok } = await reverseGeocodeWithMapbox({
        latitude: latitude as number,
        longitude: longitude as number
      });
      if (!ok) {
        console.warn(
          `Report reverse geocode failed with status ${status ?? "unknown"}.`
        );
      }
      const updatePayload: Record<string, string | null> = {};
      if (addressText) {
        updatePayload.address = addressText;
        updatePayload.address_source = "mapbox";
        updatePayload.geocoded_at = new Date().toISOString();
      }
      if (Object.keys(updatePayload).length > 0) {
        const supabaseAdmin = createSupabaseAdminClient();
        const { error: updateError } = await supabaseAdmin
          .from("reports")
          .update(updatePayload)
          .eq("id", reportId);
        if (updateError) {
          console.warn("Report enrichment update error:", updateError);
        }
      }
    } catch (error) {
      console.warn("Report reverse geocode skipped:", error);
    }
  }

  revalidatePath("/map");
  revalidatePath("/report");

  return {
    status: "success",
    message: t(locale, "report.success.submitted"),
    reportId,
    lostCaseId,
    reportType: isLost ? "lost" : "need_help"
  };
}

export async function resolveLostReport(
  _prevState: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const localeInput = getString(formData, "locale");
  const locale = isLocale(localeInput) ? localeInput : "en";
  const reportIdInput = getString(formData, "report_id");
  const contact = getString(formData, "contact");

  if (isBlank(reportIdInput) || isBlank(contact)) {
    return {
      status: "error",
      ok: false,
      errorCode: "not_found",
      message: t(locale, "report.resolve.error.missingFields")
    };
  }

  const normalizedLostCaseId = normalizeLostCaseId(reportIdInput);
  const reporterContact = contact.trim();

  if (!isLostCaseIdFormat(normalizedLostCaseId)) {
    return {
      status: "error",
      ok: false,
      errorCode: "invalid_code",
      message: t(locale, "report.resolve.error.invalidCode")
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: lostCaseData, error: lostCaseError } = await supabaseAdmin
    .from("reports")
    .select("id, report_type, reporter_contact, status, resolved_at")
    .eq("report_type", "lost")
    .ilike("lost_case_id", normalizedLostCaseId)
    .maybeSingle();

  if (lostCaseError) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Resolve report fetch error:", lostCaseError);
    }
    return {
      status: "error",
      ok: false,
      errorCode: "not_found",
      message: t(locale, "report.resolve.error.notFound")
    };
  }

  if (!lostCaseData) {
    return {
      status: "error",
      ok: false,
      errorCode: "not_found",
      message: t(locale, "report.resolve.error.notFound")
    };
  }

  if (lostCaseData.report_type !== "lost") {
    return {
      status: "error",
      ok: false,
      errorCode: "not_lost",
      message: t(locale, "report.resolve.error.notLost")
    };
  }

  const storedContact = lostCaseData.reporter_contact?.trim() || "";
  if (!storedContact || storedContact !== reporterContact) {
    return {
      status: "error",
      ok: false,
      errorCode: "mismatch",
      message: t(locale, "report.resolve.error.contactMismatch")
    };
  }

  if (lostCaseData.status && lostCaseData.status !== "Reported") {
    return {
      status: "success",
      ok: true,
      errorCode: "already_resolved",
      message: t(locale, "report.resolve.success.alreadyResolved")
    };
  }

  if (lostCaseData.resolved_at) {
    return {
      status: "success",
      ok: true,
      errorCode: "already_resolved",
      message: t(locale, "report.resolve.success.alreadyResolved")
    };
  }

  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from("reports")
    .update({
      resolved_at: new Date().toISOString(),
      status: "Found"
    })
    .eq("id", lostCaseData.id)
    .eq("status", "Reported")
    .select("id");

  if (updateError || !updatedRows || updatedRows.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Resolve report update error:", updateError);
    }
    return {
      status: "error",
      ok: false,
      message: t(locale, "report.resolve.error.updateFailed")
    };
  }

  revalidatePath("/map");
  revalidatePath("/report");

  return {
    status: "success",
    ok: true,
    message: t(locale, "report.resolve.success.resolved")
  };
}

export async function cancelLostReport(
  _prevState: CancelReportState,
  formData: FormData
): Promise<CancelReportState> {
  const lostCaseIdInput = getString(formData, "lostCaseId");
  const reporterContact = getString(formData, "reporterContact");

  if (isBlank(lostCaseIdInput) || isBlank(reporterContact)) {
    return { ok: false, error: "mismatch" };
  }

  const normalizedLostCaseId = normalizeLostCaseId(lostCaseIdInput);
  const supabase = createSupabaseClient();
  const { data: lostCaseData, error: lostCaseError } = await supabase
    .from("reports")
    .select("id, report_type, reporter_contact, resolved_at, status")
    .ilike("lost_case_id", normalizedLostCaseId)
    .maybeSingle();

  if (lostCaseError) {
    console.error("Cancel report fetch error:", lostCaseError);
    return { ok: false, error: "not_found" };
  }

  let data = lostCaseData;

  if (!data) {
    const looksLikeUuid = UUID_PATTERN.test(lostCaseIdInput.trim());
    if (looksLikeUuid) {
      const { data: uuidData, error: uuidError } = await supabase
        .from("reports")
        .select("id, report_type, reporter_contact, resolved_at, status")
        .eq("id", lostCaseIdInput.trim())
        .maybeSingle();

      if (uuidError || !uuidData) {
        return { ok: false, error: "not_found" };
      }
      data = uuidData;
    } else {
      return { ok: false, error: "not_found" };
    }
  }

  if (!data || data.report_type !== "lost") {
    return { ok: false, error: "not_found" };
  }

  const storedContact = data.reporter_contact?.trim() || "";
  if (!storedContact || storedContact !== reporterContact) {
    return { ok: false, error: "mismatch" };
  }

  if (data.resolved_at || (data.status && data.status !== "Reported")) {
    return { ok: false, error: "already_resolved" };
  }

  const { error: updateError } = await supabase
    .from("reports")
    .update({
      resolved_at: new Date().toISOString(),
      status: "Cancelled"
    })
    .eq("id", data.id);

  if (updateError) {
    console.error("Cancel report update error:", updateError);
    return { ok: false, error: "not_found" };
  }

  revalidatePath("/map");
  revalidatePath("/report");

  return { ok: true };
}
