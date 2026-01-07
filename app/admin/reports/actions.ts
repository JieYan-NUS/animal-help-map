"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { isAdminRequest } from "@/lib/admin/auth";
import { reverseGeocodeWithMapbox } from "@/lib/geocode";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const requireAdmin = () => {
  if (!isAdminRequest()) {
    redirect("/admin");
  }
};

const getReportId = (formData: FormData) =>
  String(formData.get("reportId") ?? "").trim();

export const deleteReport = async (formData: FormData) => {
  requireAdmin();
  const reportId = getReportId(formData);
  if (!reportId) {
    redirect("/admin/reports");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId);

  if (error) {
    console.error("Delete report error:", error);
    redirect("/admin/reports?updated=error");
  }

  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath("/report");

  redirect("/admin/reports?updated=deleted");
};

type PendingReportRow = {
  id: string;
  latitude: number | null;
  longitude: number | null;
};

export const backfillPendingAddresses = async () => {
  requireAdmin();

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .select("id, latitude, longitude")
    .is("address", null)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) {
    console.error("Backfill reports fetch error:", error);
    return;
  }

  const reports = (data as PendingReportRow[] | null) ?? [];

  for (const report of reports) {
    try {
      const latitude = report.latitude;
      const longitude = report.longitude;
      if (latitude == null || longitude == null) {
        continue;
      }
      const { addressText, requestUrl } = await reverseGeocodeWithMapbox({
        latitude,
        longitude
      });
      const hasAddress = Boolean(addressText && addressText.trim());
      console.info(
        `Backfill report ${report.id}: ${requestUrl} address=${hasAddress ? "found" : "missing"}`
      );
      if (hasAddress) {
        const { error: updateError } = await supabase
          .from("reports")
          .update({
            address: addressText,
            address_source: "mapbox",
            geocoded_at: new Date().toISOString()
          })
          .eq("id", report.id);

        if (updateError) {
          throw updateError;
        }
      }
    } catch (error) {
      console.error("Backfill report error:", error);
      await supabase
        .from("reports")
        .update({
          address_source: "error"
        })
        .eq("id", report.id);
    }
  }

  revalidatePath("/map");
  revalidatePath("/admin/reports");
  redirect("/admin/reports?updated=backfilled");
};
