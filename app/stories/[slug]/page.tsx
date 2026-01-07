import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { formatAnimalType, getStoryPhotoUrl } from "@/lib/storyUtils";
import BeforeAfterSlider from "../BeforeAfterSlider";

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
  story_photos?: {
    path: string;
    sort_order: number;
    photo_type: string | null;
  }[] | null;
};

const splitBody = (body: string): string[] =>
  body.split("\n\n").map((paragraph) => paragraph.trim()).filter(Boolean);

export default async function StoryDetailPage({ params }: PageProps) {
  noStore();
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("stories")
    .select(`
id, title, slug, animal_type, city, month_year, excerpt, content, author_name, author_contact, published_at,
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
  const beforePhoto =
    photos.find((photo) => photo.photo_type === "before") ?? photos[0] ?? null;
  const afterPhoto =
    photos.find((photo) => photo.photo_type === "after") ?? null;
  const hasBeforePhoto = Boolean(beforePhoto);
  const beforeImage = beforePhoto
    ? getStoryPhotoUrl(beforePhoto.path)
    : "/stories/placeholder-1.svg";
  const afterImage = afterPhoto?.path ? getStoryPhotoUrl(afterPhoto.path) : null;

  return (
    <>
      <Link className="story-back" href="/stories">
        Back to stories
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

      {hasBeforePhoto && afterImage ? (
        <BeforeAfterSlider
          className="story-hero"
          beforeSrc={beforeImage}
          afterSrc={afterImage}
          beforeAlt={`Before photo for ${story.title}`}
          afterAlt={`After photo for ${story.title}`}
          sizes="(max-width: 720px) 100vw, 720px"
          priority
        />
      ) : (
        <div className="story-hero">
          <Image
            src={beforeImage}
            alt={`Cover for ${story.title}`}
            fill
            sizes="(max-width: 720px) 100vw, 720px"
            priority
          />
        </div>
      )}

      <section className="story-body">
        {splitBody(story.content).map((paragraph, index) => (
          <p key={`${story.slug}-para-${index}`}>{paragraph}</p>
        ))}
      </section>

      {(story.author_name || story.author_contact) && (
        <section className="story-body">
          <p>
            Shared by{" "}
            {story.author_name ? <strong>{story.author_name}</strong> : "Anonymous"}
            {story.author_contact ? ` (${story.author_contact})` : null}.
          </p>
        </section>
      )}
    </>
  );
}
