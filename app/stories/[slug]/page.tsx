import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { formatAnimalType, getStoryPhotoUrl } from "@/lib/storyUtils";
import BeforeAfterSlider from "../BeforeAfterSlider";
import StoryGallery from "../StoryGallery";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n.server";
import { isTransformationStoryCategory } from "@/lib/storyCategories";

type PageProps = {
  params: { slug: string };
};

type StoryDetail = {
  id: string;
  title: string;
  slug: string;
  animal_type: string;
  city: string;
  month_year: string;
  excerpt: string;
  content: string;
  author_name: string | null;
  author_contact: string | null;
  category: string | null;
  story_photos?: {
    path: string;
    sort_order: number;
    photo_type: string | null;
  }[] | null;
};

export default async function StoryDetailPage({ params }: PageProps) {
  noStore();
  const locale = getServerLocale();
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("stories")
    .select(`
id, title, slug, animal_type, city, month_year, excerpt, content, author_name, author_contact, published_at,
category,
story_photos ( path, sort_order, photo_type )
`)
    .eq("slug", params.slug)
    .eq("status", "approved")
    .not("published_at", "is", null)
    .order("sort_order", { foreignTable: "story_photos", ascending: true })
    .single();

  if (error || !data) {
    notFound();
  }

  const story = data as StoryDetail;
  const photos = story.story_photos ?? [];
  const isTransformation =
    !story.category || isTransformationStoryCategory(story.category);
  const galleryImages =
    photos.length > 0
      ? photos.map((photo, index) => ({
          src: getStoryPhotoUrl(photo.path),
          alt: `${story.title} photo ${index + 1}`
        }))
      : [
          {
            src: "/stories/placeholder-1.svg",
            alt: `${story.title} photo`
          }
        ];
  const beforePhoto =
    photos.find((photo) => photo.photo_type === "before") ?? null;
  const afterPhoto =
    photos.find((photo) => photo.photo_type === "after") ?? null;
  const fallbackPhoto = photos[0] ?? null;
  const hasPhotoPair = Boolean(beforePhoto && afterPhoto) && isTransformation;
  const beforeImage = hasPhotoPair
    ? getStoryPhotoUrl(beforePhoto!.path)
    : fallbackPhoto
      ? getStoryPhotoUrl(fallbackPhoto.path)
      : "/stories/placeholder-1.svg";
  const afterImage = hasPhotoPair ? getStoryPhotoUrl(afterPhoto!.path) : null;

  return (
    <>
      <Link className="story-back" href="/stories">
        {t(locale, "stories.back")}
      </Link>

      <header className="story-header">
        <h1>{story.title}</h1>
        <div className="story-detail-meta">
          <span className="story-tag">
            {formatAnimalType(story.animal_type)}
          </span>
          <span className="story-location">{story.city}</span>
          <span className="story-date">{story.month_year}</span>
        </div>
      </header>

      {hasPhotoPair && afterImage ? (
        <BeforeAfterSlider
          className="story-hero"
          beforeSrc={beforeImage}
          afterSrc={afterImage}
          beforeAlt={`${t(locale, "stories.beforeAltPrefix")}${story.title}`}
          afterAlt={`${t(locale, "stories.afterAltPrefix")}${story.title}`}
          sizes="(max-width: 720px) 100vw, 720px"
          priority
        />
      ) : isTransformation ? (
        <div className="story-hero">
          <Image
            src={beforeImage}
            alt={`${t(locale, "stories.beforeAltPrefix")}${story.title}`}
            fill
            sizes="(max-width: 720px) 100vw, 720px"
            priority
          />
        </div>
      ) : (
        <StoryGallery
          className="story-hero"
          images={galleryImages}
          sizes="(max-width: 720px) 100vw, 720px"
          priority
        />
      )}

      <section className="story-body">
        <div className="story-content">{story.content}</div>
      </section>

      {(story.author_name || story.author_contact) && (
        <section className="story-body">
          <p>
            {t(locale, "stories.sharedBy")}
            {story.author_name ? (
              <strong>{story.author_name}</strong>
            ) : (
              t(locale, "stories.anonymous")
            )}
            {story.author_contact ? ` (${story.author_contact})` : null}.
          </p>
        </section>
      )}
    </>
  );
}
