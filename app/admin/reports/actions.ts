"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { isAdminRequest } from "@/lib/admin/auth";

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
