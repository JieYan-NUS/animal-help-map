import Image from "next/image";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { formatAnimalType, getStoryPhotoUrl } from "@/lib/storyUtils";

export const dynamic = "force-dynamic";

type StoryCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  animal_type: string;
  city: string;
  month_year: string;
  story_photos?: { path: string; sort_order: number }[] | null;
};

export default async function StoriesPage() {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("stories")
    .select(
      "id, slug, title, excerpt, animal_type, city, month_year, story_photos (path, sort_order)"
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
            <h1>Stories</h1>
            <p className="stories-subtitle">
              Rescue-to-home journeys, told by the community.
            </p>
          </div>
          <Link className="button" href="/stories/submit">
            Submit a story
          </Link>
        </div>
      </header>

      {stories.length === 0 ? (
        <section className="stories-empty" aria-live="polite">
          <p>No stories are published yet. Be the first to share one.</p>
        </section>
      ) : (
        <section className="stories-grid" aria-label="Community rescue stories">
          {stories.map((story) => {
            const photoPath = story.story_photos?.[0]?.path ?? null;
            const coverImage = photoPath
              ? getStoryPhotoUrl(photoPath)
              : "/stories/placeholder-1.svg";

            return (
              <article className="story-card" key={story.slug}>
                <div className="story-card-image">
                  <Image
                    src={coverImage}
                    alt={`Cover for ${story.title}`}
                    fill
                    sizes="(max-width: 720px) 100vw, 50vw"
                  />
                </div>
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
                    Read story
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
