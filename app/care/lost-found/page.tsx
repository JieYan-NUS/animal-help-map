import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n.server";

export default function CareLostFoundPage() {
  const locale = getServerLocale();
  const sections = [
    { key: "lost_pet", bullets: [1, 2, 3] },
    { key: "found_pet", bullets: [1, 2, 3] },
    { key: "sharing", bullets: [1, 2, 3] }
  ] as const;

  return (
    <>
      <header className="care-header">
        <h1>{t(locale, "care.pages.lost_found.title")}</h1>
        <p className="care-subtitle">
          {t(locale, "care.pages.lost_found.intro")}
        </p>
      </header>

      {sections.map((section) => (
        <section key={section.key}>
          <h2>
            {t(locale, `care.pages.lost_found.sections.${section.key}.title`)}
          </h2>
          <ul>
            {section.bullets.map((bullet) => (
              <li key={bullet}>
                {t(
                  locale,
                  `care.pages.lost_found.sections.${section.key}.bullets.${bullet}`
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p>{t(locale, "care.pages.lost_found.note")}</p>
    </>
  );
}
