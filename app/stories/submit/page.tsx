import Link from "next/link";
import StorySubmitForm from "./StorySubmitForm";

export default function StorySubmitPage() {
  return (
    <>
      <Link className="story-back" href="/stories">
        Back to stories
      </Link>

      <header className="stories-header">
        <h1>Share a Rescue Story</h1>
        <p className="stories-subtitle">
          Tell the community about a rescue journey. Your story will be reviewed
          before it appears on the public list.
        </p>
      </header>

      <StorySubmitForm />
    </>
  );
}
