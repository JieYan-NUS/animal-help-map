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

const getCategoryInput = (formData: FormData) =>
  String(formData.get("category") ?? "").trim().toLowerCase();

export const approveStory = async (formData: FormData) => {
  requireAdmin();
  const storyId = getStoryId(formData);
  if (!storyId) {
    redirect("/admin/stories?status=pending");
  }

  const supabase = createSupabaseAdminClient();
  const { data: currentStory, error: fetchError } = await supabase
    .from("stories")
    .select("slug, category")
    .eq("id", storyId)
    .single();

  if (fetchError || !currentStory?.slug) {
    console.error("Approve story fetch error:", fetchError);
    redirect(`/admin/stories/${storyId}?updated=error`);
  }

  const allowedCategories = new Set([
    "rescue",
    "lost_found",
    "shelter_foster",
    "community"
  ]);
  const selectedCategoryRaw = getCategoryInput(formData);
  const selectedCategory = allowedCategories.has(selectedCategoryRaw)
    ? selectedCategoryRaw
    : "";
  const categoryValue =
    typeof currentStory.category === "string"
      ? currentStory.category.trim()
      : "";
  let categoryUpdate: string | null = null;
  if (selectedCategory) {
    if (selectedCategory !== categoryValue) {
      categoryUpdate = selectedCategory;
    }
  } else if (!categoryValue) {
    categoryUpdate = "rescue";
  }
  const updatePayload = {
    status: "approved",
    published_at: new Date().toISOString(),
    ...(categoryUpdate ? { category: categoryUpdate } : {})
  };

  const { data, error } = await supabase
    .from("stories")
    .update(updatePayload)
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
