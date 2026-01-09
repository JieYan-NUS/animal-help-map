import Link from "next/link";
import StorySubmitForm from "./StorySubmitForm";
import { getServerLocale, t } from "@/lib/i18n";

export default function StorySubmitPage() {
  const locale = getServerLocale();
  return (
    <>
      <Link className="story-back" href="/stories">
        {t(locale, "stories.back")}
      </Link>

      <header className="stories-header">
        <h1>{t(locale, "stories.submitTitle")}</h1>
        <p className="stories-subtitle">
          {t(locale, "stories.submitSubtitle")}
        </p>
      </header>

      <StorySubmitForm locale={locale} />
    </>
  );
}
