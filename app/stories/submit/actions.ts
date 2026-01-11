"use server";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { createStorySlug, sanitizeFileName } from "@/lib/storyUtils";
import { isLocale, t } from "@/lib/i18n";
import {
  DEFAULT_STORY_CATEGORY,
  isGalleryStoryCategory,
  isStoryCategory
} from "@/lib/storyCategories";

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
  const localeInput = getString(formData, "locale");
  const locale = isLocale(localeInput) ? localeInput : "en";
  const fieldErrors: Record<string, string> = {};

  const title = getString(formData, "title");
  const animalTypeInput = getString(formData, "animal_type");
  const city = getString(formData, "city");
  const monthYear = getString(formData, "month_year");
  const excerpt = getString(formData, "excerpt");
  const content = getString(formData, "content");
  const authorName = getString(formData, "author_name");
  const authorContact = getString(formData, "author_contact");
  const categoryInput = getString(formData, "category");
  const normalizedCategory = categoryInput.toLowerCase();
  const mappedCategory =
    normalizedCategory === "community" ? "community_moments" : normalizedCategory;
  const category = isStoryCategory(mappedCategory)
    ? mappedCategory
    : DEFAULT_STORY_CATEGORY;
  const isAnimalTypeHidden =
    category === "community_moments" || category === "this_is_pawscue";
  const isAnimalTypeRequired = category === "rescue" || category === "lost_found";
  const isImageRequired = category === "rescue" || category === "lost_found";
  const isMultiPhotoCategory = isGalleryStoryCategory(category);
  const consent = formData.get("consent");

  if (!title) fieldErrors.title = t(locale, "stories.error.titleRequired");
  const animalTypeValue = isAnimalTypeHidden ? "other" : animalTypeInput;

  if (!animalTypeValue && isAnimalTypeRequired) {
    fieldErrors.animal_type = t(locale, "stories.error.animalTypeRequired");
  }
  if (!city) fieldErrors.city = t(locale, "stories.error.cityRequired");
  if (!monthYear) fieldErrors.month_year = t(locale, "stories.error.monthYearRequired");
  if (!excerpt) fieldErrors.excerpt = t(locale, "stories.error.excerptRequired");
  if (!content) fieldErrors.content = t(locale, "stories.error.contentRequired");
  if (excerpt.length > 140) {
    fieldErrors.excerpt = t(locale, "stories.error.excerptTooLong");
  }
  if (!consent) {
    fieldErrors.consent = t(locale, "stories.error.consentRequired");
  }

  const allowedAnimalTypes = new Set(["cat", "dog", "bird", "other"]);
  const animalTypeForDb =
    animalTypeValue || (isAnimalTypeRequired ? "" : "other");
  if (animalTypeForDb && !allowedAnimalTypes.has(animalTypeForDb)) {
    fieldErrors.animal_type = t(locale, "stories.error.animalTypeInvalid");
  }

  const beforePhoto = formData.get("before_photo");
  const afterPhoto = formData.get("after_photo");
  const extraPhotoKeys = [
    "photo_3",
    "photo_4",
    "photo_5",
    "photo_6",
    "photo_7",
    "photo_8",
    "photo_9",
    "photo_10"
  ] as const;
  const extraPhotos = isMultiPhotoCategory
    ? extraPhotoKeys.map((key) => ({
        key,
        value: formData.get(key)
      }))
    : [];

  const validatePhoto = (
    file: unknown,
    field: string,
    required: boolean
  ) => {
    if (!(file instanceof File) || file.size === 0) {
      if (required) {
        fieldErrors[field] = t(locale, "stories.error.beforePhotoRequired");
      }
      return null;
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      fieldErrors[field] = t(locale, "stories.error.photoType");
      return null;
    }

    if (file.size > MAX_FILE_BYTES) {
      fieldErrors[field] = t(locale, "stories.error.photoSize");
      return null;
    }

    return file;
  };

  const beforeFile = validatePhoto(beforePhoto, "before_photo", isImageRequired);
  const afterFile = validatePhoto(afterPhoto, "after_photo", false);
  const extraFiles = extraPhotos
    .map(({ key, value }) => ({
      key,
      file: validatePhoto(value, key, false)
    }))
    .filter(
      (
        entry
      ): entry is { key: (typeof extraPhotoKeys)[number]; file: File } =>
        Boolean(entry.file)
    );

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: t(locale, "stories.error.fixFields"),
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
    animal_type: animalTypeForDb,
    city,
    month_year: monthYear,
    excerpt,
    content,
    author_name: authorName || null,
    author_contact: authorContact || null,
    category,
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
      message: `${t(locale, "stories.error.saveFailed")} ${errorMessage}`
    };
  }

  const uploadedPaths: {
    path: string;
    photo_type: "before" | "after" | null;
  }[] = [];

  const uploadPhoto = async (
    file: File,
    filenameBase: string,
    photoType: "before" | "after" | null
  ) => {
    const safeName = sanitizeFileName(file.name);
    const extension = safeName.includes(".")
      ? safeName.split(".").pop()
      : undefined;
    const filename = extension ? `${filenameBase}.${extension}` : filenameBase;
    const path = `stories/${storyId}/${filename}`;

    // Requires the "story-photos" bucket to exist (public for Phase B).
    const { error: uploadError } = await supabase.storage
      .from("story-photos")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error("Story photo upload error:", uploadError);
      const errorCode = (uploadError as { code?: string }).code;
      const errorMessage = uploadError
        ? [errorCode, uploadError.message].filter(Boolean).join(": ")
        : "Unknown error";
      return {
        status: "error" as const,
        message: `${t(locale, "stories.error.photoUploadFailed")} ${errorMessage}`
      };
    }

    uploadedPaths.push({ path, photo_type: photoType });
    return null;
  };

  if (beforeFile) {
    const uploadState = await uploadPhoto(beforeFile, "before", "before");
    if (uploadState) return uploadState;
  }

  if (afterFile) {
    const uploadState = await uploadPhoto(afterFile, "after", "after");
    if (uploadState) return uploadState;
  }

  for (const extra of extraFiles) {
    if (!extra.file) continue;
    const filenameBase = extra.key.replace("_", "-");
    const uploadState = await uploadPhoto(extra.file, filenameBase, null);
    if (uploadState) return uploadState;
  }

  if (uploadedPaths.length > 0) {
    const { error: photoError } = await supabase.from("story_photos").insert(
      uploadedPaths.map((photo, index) => ({
        story_id: storyId,
        path: photo.path,
        photo_type: photo.photo_type,
        sort_order: index
      }))
    );

    if (photoError) {
      console.error("Story photos insert error:", photoError);
      const errorMessage = photoError
        ? [photoError.code, photoError.message].filter(Boolean).join(": ")
        : "Unknown error";
      return {
        status: "error",
        message: `${t(locale, "stories.error.photoAttachFailed")} ${errorMessage}`
      };
    }
  }

  // TODO(phase-c): add moderation tools and RLS policies for stories.

  return {
    status: "success",
    message: t(locale, "stories.success.submitted")
  };
}
