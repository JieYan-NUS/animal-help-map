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

export default async function StoriesPage() {
  noStore();
  const locale = getServerLocale();
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("stories")
    .select(
      "id, slug, title, excerpt, animal_type, city, month_year, story_photos (path, sort_order, photo_type)"
    )
    .eq("status", "approved")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .order("sort_order", { foreignTable: "story_photos", ascending: true });

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
