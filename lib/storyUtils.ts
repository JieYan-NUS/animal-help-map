export const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "story";
};

export const createStorySlug = (title: string): string => {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slugify(title)}-${suffix}`;
};

export const sanitizeFileName = (filename: string): string => {
  const cleaned = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "photo";
};

export const getStoryPhotoUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return path;
  return `${baseUrl}/storage/v1/object/public/story-photos/${path}`;
};

export const formatAnimalType = (value: string): string => {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
};
