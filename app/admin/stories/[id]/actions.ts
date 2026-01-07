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

const getStoryId = (formData: FormData) =>
  String(formData.get("storyId") ?? "").trim();

export const approveStory = async (formData: FormData) => {
  requireAdmin();
  const storyId = getStoryId(formData);
  if (!storyId) {
    redirect("/admin/stories?status=pending");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stories")
    .update({ status: "approved", published_at: new Date().toISOString() })
    .eq("id", storyId)
    .select("slug")
    .single();

  if (error || !data?.slug) {
    console.error("Approve story error:", error);
    redirect(`/admin/stories/${storyId}?updated=error`);
  }

  revalidatePath("/stories");
  revalidatePath(`/stories/${data.slug}`);

  redirect(`/admin/stories/${storyId}?updated=approved`);
};

export const rejectStory = async (formData: FormData) => {
  requireAdmin();
  const storyId = getStoryId(formData);
  if (!storyId) {
    redirect("/admin/stories?status=pending");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stories")
    .update({ status: "rejected", published_at: null })
    .eq("id", storyId)
    .select("slug")
    .single();

  if (error || !data?.slug) {
    console.error("Reject story error:", error);
    redirect(`/admin/stories/${storyId}?updated=error`);
  }

  revalidatePath("/stories");
  revalidatePath(`/stories/${data.slug}`);

  redirect(`/admin/stories/${storyId}?updated=rejected`);
};
