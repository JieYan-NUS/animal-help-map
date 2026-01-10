import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { formatAnimalType, getStoryPhotoUrl } from "@/lib/storyUtils";
import BeforeAfterSlider from "./BeforeAfterSlider";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n.server";

type StoryCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  animal_type: string;
  city: string;
  month_year: string;
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
  const activeCategory =
    searchParams?.category === "lost_found" ? "lost_found" : "rescue";

  let storiesQuery = supabase
    .from("stories")
    .select(
      "id, slug, title, excerpt, animal_type, city, month_year, story_photos (path, sort_order, photo_type)"
    )
    .eq("status", "approved")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .order("sort_order", { foreignTable: "story_photos", ascending: true });

  if (activeCategory === "lost_found") {
    storiesQuery = storiesQuery.eq("category", "lost_found");
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
            <p className="stories-subtitle">
              {t(locale, "stories.subtitle")}
            </p>
          </div>
          <Link className="button" href="/stories/submit">
            {t(locale, "stories.submitCta")}
          </Link>
        </div>
        <div className="stories-tabs" role="tablist" aria-label={t(locale, "stories.tabs.label")}>
          <Link
            className={`stories-tab${activeCategory === "rescue" ? " is-active" : ""}`}
            href="/stories"
            role="tab"
            aria-selected={activeCategory === "rescue"}
          >
            {t(locale, "stories.tabs.rescue")}
          </Link>
          <Link
            className={`stories-tab${activeCategory === "lost_found" ? " is-active" : ""}`}
            href="/stories?category=lost_found"
            role="tab"
            aria-selected={activeCategory === "lost_found"}
          >
            {t(locale, "stories.tabs.lostFound")}
          </Link>
          <button
            className="stories-tab is-disabled"
            type="button"
            role="tab"
            aria-selected="false"
            aria-disabled="true"
            disabled
          >
            {t(locale, "stories.tabs.shelter")} ({t(locale, "stories.tabs.comingSoon")})
          </button>
          <button
            className="stories-tab is-disabled"
            type="button"
            role="tab"
            aria-selected="false"
            aria-disabled="true"
            disabled
          >
            {t(locale, "stories.tabs.community")} ({t(locale, "stories.tabs.comingSoon")})
          </button>
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
            const beforePhoto =
              photos.find((photo) => photo.photo_type === "before") ?? null;
            const afterPhoto =
              photos.find((photo) => photo.photo_type === "after") ?? null;
            const fallbackPhoto = photos[0] ?? null;
            const hasPhotoPair = Boolean(beforePhoto && afterPhoto);
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
                ) : (
                  <div className="story-card-image">
                    <Image
                      alt={`Cover for ${story.title}`}
                      src={beforeImage}
                      fill
                      sizes="(max-width: 720px) 100vw, 50vw"
                    />
                  </div>
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
