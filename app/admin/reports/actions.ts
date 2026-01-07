"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

  const supabase = createSupabaseAdminClient();
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

  redirect("/admin/reports?updated=deleted");
};
