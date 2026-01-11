import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatAnimalType } from "@/lib/storyUtils";
import { isAdminRequest } from "@/lib/admin/auth";
import { logoutAdmin } from "@/app/admin/actions";
import { approveStory, rejectStory } from "@/app/admin/stories/[id]/actions";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n.server";
import {
  DEFAULT_STORY_CATEGORY,
  STORY_CATEGORIES,
  isStoryCategory
} from "@/lib/storyCategories";

export const dynamic = "force-dynamic";

type AdminStoryDetailPageProps = {
  params: { id: string };
  searchParams?: { updated?: string };
};

type StoryPhoto = {
  path: string;
  sort_order: number;
  photo_type: string | null;
};

type StoryDetail = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  animal_type: string;
  city: string;
  month_year: string;
  author_name: string | null;
  author_contact: string | null;
  created_at: string;
  published_at: string | null;
  status: "pending" | "approved" | "rejected";
  category: string | null;
  story_photos?: StoryPhoto[] | null;
};

const splitBody = (body: string): string[] =>
  body.split("\n\n").map((paragraph) => paragraph.trim()).filter(Boolean);

const statusCopy: Record<string, string> = {
  approved: "Story approved.",
  rejected: "Story rejected.",
  error: "We couldn't update that story. Try again."
};

export default async function AdminStoryDetailPage({
  params,
  searchParams
}: AdminStoryDetailPageProps) {
  if (!isAdminRequest()) {
    redirect("/admin");
  }

  const locale = getServerLocale();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stories")
    .select(
      "id, slug, title, excerpt, content, animal_type, city, month_year, author_name, author_contact, created_at, published_at, status, category, story_photos (path, sort_order, photo_type)"
    )
    .eq("id", params.id)
    .order("sort_order", { foreignTable: "story_photos", ascending: true })
    .single();

  if (error || !data) {
    return (
      <>
        <Link className="story-back" href="/admin/stories">
          Back to review list
        </Link>
        <section className="admin-empty" aria-live="polite">
          <p>Story not found.</p>
        </section>
      </>
    );
  }

  const story = data as StoryDetail;
  const rawCategory =
    typeof story.category === "string" && story.category.trim()
      ? story.category.trim()
      : "";
  const normalizedCategory =
    rawCategory === "community" ? "community_moments" : rawCategory;
  const categoryValue = isStoryCategory(normalizedCategory)
    ? normalizedCategory
    : DEFAULT_STORY_CATEGORY;
  const photos = story.story_photos ?? [];
  const photoUrls = photos.map((photo) => {
    const { data: publicData } = supabase.storage
      .from("story-photos")
      .getPublicUrl(photo.path);
    return { ...photo, url: publicData.publicUrl };
  });
  const beforePhoto =
    photoUrls.find((photo) => photo.photo_type === "before") ?? null;
  const afterPhoto =
    photoUrls.find((photo) => photo.photo_type === "after") ?? null;
  const fallbackPhoto = photoUrls[0] ?? null;
  const hasPhotoPair = Boolean(beforePhoto && afterPhoto);

  const updatedMessage =
    searchParams?.updated && statusCopy[searchParams.updated]
      ? statusCopy[searchParams.updated]
      : null;

  return (
    <>
      <header className="admin-header admin-header-row">
        <div>
          <Link className="story-back" href="/admin/stories">
            Back to review list
          </Link>
          <h1>{story.title}</h1>
          <div className="admin-story-meta">
            <span className="story-tag">
              {formatAnimalType(story.animal_type)}
            </span>
            <span>{story.city}</span>
            <span>{story.month_year}</span>
            <span className="admin-status">{story.status}</span>
          </div>
        </div>
        <form action={logoutAdmin}>
          <button className="button button-secondary" type="submit">
            Log out
          </button>
        </form>
      </header>

      {updatedMessage ? (
        <div className="admin-callout" role="status">
          {updatedMessage}
        </div>
      ) : null}

      <section className="admin-story-detail">
        <div className="admin-story-card">
          <p className="admin-story-excerpt">{story.excerpt}</p>
          <div className="admin-story-content">
            {splitBody(story.content).map((paragraph, index) => (
              <p key={`${story.id}-para-${index}`}>{paragraph}</p>
            ))}
          </div>
        </div>

        <aside className="admin-sidebar">
          <div className="admin-panel">
            <h2>Submission details</h2>
            <dl className="admin-meta-list">
              <div>
                <dt>Slug</dt>
                <dd>/{story.slug}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(story.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Published</dt>
                <dd>
                  {story.published_at
                    ? new Date(story.published_at).toLocaleString()
                    : "Not published"}
                </dd>
              </div>
              <div>
                <dt>Author</dt>
                <dd>{story.author_name || "Anonymous"}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{story.author_contact || "Not provided"}</dd>
              </div>
            </dl>
          </div>

          <div className="admin-panel admin-actions">
            <h2>Review action</h2>
            <div className="admin-action-buttons">
              <form action={approveStory}>
                <input type="hidden" name="storyId" value={story.id} />
                <div className="admin-field">
                  <label htmlFor="story-category">
                    {t(locale, "admin.stories.category.label")}
                  </label>
                  <select
                    id="story-category"
                    name="category"
                    defaultValue={categoryValue}
                  >
                    {STORY_CATEGORIES.map((category) => (
                      <option key={category.id} value={category.id}>
                        {t(locale, category.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="button" type="submit">
                  Approve
                </button>
              </form>
              <form action={rejectStory}>
                <input type="hidden" name="storyId" value={story.id} />
                <button className="button button-secondary" type="submit">
                  Reject
                </button>
              </form>
            </div>
          </div>
        </aside>
      </section>

      <section className="admin-photo-grid" aria-label="Story photos">
        {!beforePhoto && !afterPhoto && !fallbackPhoto ? (
          <div className="admin-empty">
            <p>No photos attached.</p>
          </div>
        ) : (
          <>
            {hasPhotoPair && beforePhoto ? (
              <figure className="admin-photo" key={beforePhoto.path}>
                <Image
                  src={beforePhoto.url}
                  alt={`Before photo for ${story.title}`}
                  fill
                  sizes="(max-width: 720px) 100vw, 33vw"
                />
                <figcaption>Before</figcaption>
              </figure>
            ) : null}
            {hasPhotoPair && afterPhoto ? (
              <figure className="admin-photo" key={afterPhoto.path}>
                <Image
                  src={afterPhoto.url}
                  alt={`After photo for ${story.title}`}
                  fill
                  sizes="(max-width: 720px) 100vw, 33vw"
                />
                <figcaption>After</figcaption>
              </figure>
            ) : null}
            {!hasPhotoPair && fallbackPhoto ? (
              <figure className="admin-photo" key={fallbackPhoto.path}>
                <Image
                  src={fallbackPhoto.url}
                  alt={`Before photo for ${story.title}`}
                  fill
                  sizes="(max-width: 720px) 100vw, 33vw"
                />
                <figcaption>Before</figcaption>
              </figure>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}
