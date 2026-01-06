"use server";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { createStorySlug, sanitizeFileName } from "@/lib/storyUtils";

const MAX_PHOTOS = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export type StoryFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const getString = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export async function submitStory(
  _prevState: StoryFormState,
  formData: FormData
): Promise<StoryFormState> {
  const fieldErrors: Record<string, string> = {};

  const title = getString(formData, "title");
  const animalType = getString(formData, "animal_type");
  const city = getString(formData, "city");
  const monthYear = getString(formData, "month_year");
  const excerpt = getString(formData, "excerpt");
  const content = getString(formData, "content");
  const authorName = getString(formData, "author_name");
  const authorContact = getString(formData, "author_contact");
  const consent = formData.get("consent");

  if (!title) fieldErrors.title = "Title is required.";
  if (!animalType) fieldErrors.animal_type = "Animal type is required.";
  if (!city) fieldErrors.city = "City is required.";
  if (!monthYear) fieldErrors.month_year = "Month and year are required.";
  if (!excerpt) fieldErrors.excerpt = "Excerpt is required.";
  if (!content) fieldErrors.content = "Story content is required.";
  if (excerpt.length > 140) {
    fieldErrors.excerpt = "Excerpt must be 140 characters or less.";
  }
  if (!consent) {
    fieldErrors.consent = "Consent is required to submit a story.";
  }

  const allowedAnimalTypes = new Set(["cat", "dog", "bird", "other"]);
  if (animalType && !allowedAnimalTypes.has(animalType)) {
    fieldErrors.animal_type = "Please choose a valid animal type.";
  }

  const files = formData
    .getAll("photos")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (files.length > MAX_PHOTOS) {
    fieldErrors.photos = "You can upload up to 3 photos.";
  }

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      fieldErrors.photos = "Only JPG, PNG, or WebP images are allowed.";
      break;
    }
    if (file.size > MAX_FILE_BYTES) {
      fieldErrors.photos = "Each photo must be 5MB or smaller.";
      break;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and try again.",
      fieldErrors
    };
  }

  const supabase = createSupabaseClient();

  const slug = createStorySlug(title);
  const storyId = crypto.randomUUID();
  const insertPayload = {
    id: storyId,
    title,
    slug,
    animal_type: animalType,
    city,
    month_year: monthYear,
    excerpt,
    content,
    author_name: authorName || null,
    author_contact: authorContact || null,
    status: "pending"
  };

  console.log("Story insert payload:", {
    keys: Object.keys(insertPayload),
    status: insertPayload.status
  });

  const { error: storyError } = await supabase
    .from("stories")
    .insert(insertPayload);

  if (storyError) {
    console.error("Story insert error:", storyError);
    const errorMessage = storyError
      ? [storyError.code, storyError.message].filter(Boolean).join(": ")
      : "Unknown error";
    return {
      status: "error",
      message: `We could not save your story. ${errorMessage}`
    };
  }

  const uploadedPaths: { path: string; sort_order: number }[] = [];

  for (const [index, file] of files.entries()) {
    const safeName = sanitizeFileName(file.name);
    const extension = safeName.includes(".")
      ? safeName.split(".").pop()
      : undefined;
    const filename = extension
      ? `${crypto.randomUUID()}.${extension}`
      : crypto.randomUUID();
    const path = `stories/${storyId}/${filename}`;

    // Requires the "story-photos" bucket to exist (public for Phase B).
    const { error: uploadError } = await supabase.storage
      .from("story-photos")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      console.error("Story photo upload error:", uploadError);
      const errorCode = (uploadError as { code?: string }).code;
      const errorMessage = uploadError
        ? [errorCode, uploadError.message].filter(Boolean).join(": ")
        : "Unknown error";
      return {
        status: "error",
        message: `We saved your story, but uploading a photo failed. ${errorMessage}`
      };
    }

    uploadedPaths.push({ path, sort_order: index });
  }

  if (uploadedPaths.length > 0) {
    const { error: photoError } = await supabase
      .from("story_photos")
      .insert(
        uploadedPaths.map((photo) => ({
          story_id: storyId,
          path: photo.path,
          sort_order: photo.sort_order
        }))
      );

    if (photoError) {
      console.error("Story photos insert error:", photoError);
      const errorMessage = photoError
        ? [photoError.code, photoError.message].filter(Boolean).join(": ")
        : "Unknown error";
      return {
        status: "error",
        message: `We saved your story, but attaching photos failed. ${errorMessage}`
      };
    }
  }

  // TODO(phase-c): add moderation tools and RLS policies for stories.

  return {
    status: "success",
    message: "Thanks! Your story is submitted and pending review."
  };
}
