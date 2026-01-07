import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatAnimalType } from "@/lib/storyUtils";
import { isAdminRequest } from "@/lib/admin/auth";
import { logoutAdmin } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type AdminStoriesPageProps = {
  searchParams?: { status?: string };
};

type StoryRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  animal_type: string;
  city: string;
  month_year: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
};

type StoryPhotoRow = {
  story_id: string;
  path: string;
  sort_order: number | null;
  photo_type: string | null;
};

type StoryPhoto = {
  path: string;
  publicUrl: string;
  photo_type: string | null;
};

const allowedStatuses = ["pending", "approved", "rejected"] as const;

export default async function AdminStoriesPage({
  searchParams
}: AdminStoriesPageProps) {
  if (!isAdminRequest()) {
    redirect("/admin");
  }

  const statusParam = searchParams?.status ?? "pending";
  const status = allowedStatuses.includes(statusParam as StoryRow["status"])
    ? (statusParam as StoryRow["status"])
    : "pending";

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stories")
    .select(
      "id, slug, title, excerpt, animal_type, city, month_year, created_at, status"
    )
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin stories fetch error:", error);
  }

  const stories = (data as StoryRow[] | null) ?? [];
  const storyIds = stories.map((story) => story.id);
  const photosByStoryId: Record<string, StoryPhoto[]> = {};

  if (storyIds.length > 0) {
    const { data: photoData, error: photoError } = await supabase
      .from("story_photos")
      .select("story_id, path, sort_order, photo_type")
      .in("story_id", storyIds)
      .order("story_id")
      .order("sort_order");

    if (photoError) {
      console.error("Admin story photos fetch error:", photoError);
    }

    const supabasePublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    (photoData as StoryPhotoRow[] | null)?.forEach((photo) => {
      const { data: publicData } = supabase.storage
        .from("story-photos")
        .getPublicUrl(photo.path);
      const publicUrl =
        publicData?.publicUrl ??
        (supabasePublicUrl
          ? `${supabasePublicUrl}/storage/v1/object/public/story-photos/${photo.path}`
          : "");

      if (!publicUrl) {
        return;
      }

      if (!photosByStoryId[photo.story_id]) {
        photosByStoryId[photo.story_id] = [];
      }

      photosByStoryId[photo.story_id].push({
        path: photo.path,
        publicUrl,
        photo_type: photo.photo_type
      });
    });
  }

  return (
    <>
      <header className="admin-header admin-header-row">
        <div>
          <h1>Story Review</h1>
          <p className="admin-subtitle">
            Review, publish, or archive community submissions.
          </p>
        </div>
        <div className="admin-action-buttons">
          <Link className="admin-button" href="/admin">
            Admin home
          </Link>
          <Link
            aria-current="page"
            className="admin-button is-active"
            href="/admin/stories"
          >
            Review stories
          </Link>
          <Link className="admin-button" href="/admin/reports">
            Review reports
          </Link>
          <form action={logoutAdmin}>
            <button className="admin-button" type="submit">
              Log out
            </button>
          </form>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Story status filters">
        {allowedStatuses.map((tab) => (
          <Link
            key={tab}
            className={`admin-tab ${status === tab ? "is-active" : ""}`}
            href={`/admin/stories?status=${tab}`}
          >
            {tab[0].toUpperCase()}
            {tab.slice(1)}
          </Link>
        ))}
      </nav>

      {stories.length === 0 ? (
        <section className="admin-empty" aria-live="polite">
          <p>No stories in this status right now.</p>
        </section>
      ) : (
        <section className="admin-stories" aria-label="Submitted stories">
          {stories.map((story) => (
            <article className="admin-story-card" key={story.id}>
              <div className="admin-story-meta">
                <span className="story-tag">
                  {formatAnimalType(story.animal_type)}
                </span>
                <span>{story.city}</span>
                <span>{story.month_year}</span>
                <span>{new Date(story.created_at).toLocaleDateString()}</span>
              </div>
              <h2 className="admin-story-title">{story.title}</h2>
              <p className="admin-story-excerpt">{story.excerpt}</p>
              {photosByStoryId[story.id]?.length ? (
                <div
                  className="admin-story-thumbnails"
                  aria-label="Story photos"
                >
                  {(() => {
                    const photos = photosByStoryId[story.id];
                    const before =
                      photos.find((photo) => photo.photo_type === "before") ??
                      photos[0];
                    const after =
                      photos.find((photo) => photo.photo_type === "after") ??
                      null;

                    return (
                      <>
                        {before ? (
                          <div className="admin-story-thumb" key={before.path}>
                            <img
                              alt={`${story.title} before`}
                              loading="lazy"
                              src={before.publicUrl}
                            />
                            <span className="admin-story-thumb-tag">Before</span>
                          </div>
                        ) : null}
                        {after ? (
                          <div className="admin-story-thumb" key={after.path}>
                            <img
                              alt={`${story.title} after`}
                              loading="lazy"
                              src={after.publicUrl}
                            />
                            <span className="admin-story-thumb-tag">After</span>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              ) : null}
              <div className="admin-story-footer">
                <span className="admin-story-slug">/{story.slug}</span>
                <Link className="button" href={`/admin/stories/${story.id}`}>
                  Review
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
