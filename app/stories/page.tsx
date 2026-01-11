import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { formatAnimalType, getStoryPhotoUrl } from "@/lib/storyUtils";
import BeforeAfterSlider from "./BeforeAfterSlider";
import StoryGallery from "./StoryGallery";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n.server";
import {
  DEFAULT_STORY_CATEGORY,
  STORY_CATEGORIES,
  isStoryCategory,
  isTransformationStoryCategory
} from "@/lib/storyCategories";

type StoryCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  animal_type: string;
  city: string;
  month_year: string;
  category: string | null;
  story_photos?: {
    path: string;
    sort_order: number;
    photo_type: string | null;
  }[] | null;
};

type StoriesPageProps = {
  searchParams?: { category?: string };
};

export default async function StoriesPage({ searchParams }: StoriesPageProps) {
  noStore();
  const locale = getServerLocale();
  const supabase = createSupabaseClient();
  const categoriesById = STORY_CATEGORIES.reduce(
    (acc, category) => {
      acc[category.id] = category;
      return acc;
    },
    {} as Record<(typeof STORY_CATEGORIES)[number]["id"], (typeof STORY_CATEGORIES)[number]>
  );
  const tabOrder: (typeof STORY_CATEGORIES)[number]["id"][] = [
    "this_is_pawscue",
    "rescue",
    "lost_found",
    "community_moments",
    "shared_animal_stories"
  ];
  const categoryParam = searchParams?.category ?? "";
  const normalizedCategoryParam =
    categoryParam === "community" ? "community_moments" : categoryParam;
  const activeCategory = isStoryCategory(normalizedCategoryParam)
    ? normalizedCategoryParam
    : DEFAULT_STORY_CATEGORY;

  let storiesQuery = supabase
    .from("stories")
    .select(
      "id, slug, title, excerpt, animal_type, city, month_year, category, story_photos (path, sort_order, photo_type)"
    )
    .eq("status", "approved")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .order("sort_order", { foreignTable: "story_photos", ascending: true });

  if (activeCategory === "lost_found") {
    storiesQuery = storiesQuery.eq("category", "lost_found");
  } else if (activeCategory === "shelter_foster") {
    storiesQuery = storiesQuery.eq("category", "shelter_foster");
  } else if (activeCategory === "community_moments") {
    storiesQuery = storiesQuery.or("category.eq.community_moments,category.eq.community");
  } else if (activeCategory === "this_is_pawscue") {
    storiesQuery = storiesQuery.eq("category", "this_is_pawscue");
  } else if (activeCategory === "shared_animal_stories") {
    storiesQuery = storiesQuery.eq("category", "shared_animal_stories");
  } else {
    storiesQuery = storiesQuery.or("category.eq.rescue,category.is.null,category.eq.");
  }

  const { data, error } = await storiesQuery;

  if (error) {
    console.error("Stories fetch error:", error);
  }

  const stories = (data as StoryCard[] | null) ?? [];

  return (
    <>
      <header className="stories-header">
        <div className="stories-header-row">
          <div>
            <h1>{t(locale, "stories.title")}</h1>
          </div>
          <Link className="button" href="/stories/submit">
            {t(locale, "stories.submitCta")}
          </Link>
        </div>
        <div className="stories-tabs" role="tablist" aria-label={t(locale, "stories.tabs.label")}>
          {tabOrder.map((categoryId) => {
            const category = categoriesById[categoryId];
            if (!category) {
              return null;
            }
            const isActive = activeCategory === category.id;
            const href =
              category.id === DEFAULT_STORY_CATEGORY
                ? "/stories"
                : `/stories?category=${category.id}`;
            return (
              <Link
                key={category.id}
                className={`stories-tab${isActive ? " is-active" : ""}`}
                href={href}
                role="tab"
                aria-selected={isActive}
              >
                {t(locale, category.labelKey)}
              </Link>
            );
          })}
        </div>
      </header>

      {stories.length === 0 ? (
        <section className="stories-empty" aria-live="polite">
          <p>{t(locale, "stories.empty")}</p>
        </section>
      ) : (
        <section className="stories-grid" aria-label={t(locale, "stories.listLabel")}>
          {stories.map((story) => {
            const photos = story.story_photos ?? [];
            const isTransformation =
              !story.category || isTransformationStoryCategory(story.category);
            const galleryImages =
              photos.length > 0
                ? photos.map((photo, index) => ({
                    src: getStoryPhotoUrl(photo.path),
                    alt: `Photo ${index + 1} for ${story.title}`
                  }))
                : [
                    {
                      src: "/stories/placeholder-1.svg",
                      alt: `Cover for ${story.title}`
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
            const afterImage = hasPhotoPair
              ? getStoryPhotoUrl(afterPhoto!.path)
              : null;

            return (
              <article className="story-card" key={story.slug}>
                {hasPhotoPair && afterImage ? (
                  <BeforeAfterSlider
                    className="story-card-image"
                    beforeSrc={beforeImage}
                    afterSrc={afterImage}
                    beforeAlt={`Before photo for ${story.title}`}
                    afterAlt={`After photo for ${story.title}`}
                  />
                ) : isTransformation ? (
                  <div className="story-card-image">
                    <Image
                      alt={`Cover for ${story.title}`}
                      src={beforeImage}
                      fill
                      sizes="(max-width: 720px) 100vw, 50vw"
                    />
                  </div>
                ) : (
                  <StoryGallery
                    className="story-card-image"
                    images={galleryImages}
                    sizes="(max-width: 720px) 100vw, 50vw"
                  />
                )}
                <div className="story-card-body">
                  <div className="story-card-meta">
                    <span className="story-tag">
                      {formatAnimalType(story.animal_type)}
                    </span>
                    <span className="story-location">{story.city}</span>
                    <span className="story-date">{story.month_year}</span>
                  </div>
                  <h3 className="story-card-title">{story.title}</h3>
                  <p className="story-card-text">{story.excerpt}</p>
                  <Link
                    className="button story-card-button"
                    href={`/stories/${story.slug}`}
                  >
                    {t(locale, "stories.readStory")}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
