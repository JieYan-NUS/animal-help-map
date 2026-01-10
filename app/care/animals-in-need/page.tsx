import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n.server";

export default function CareAnimalsInNeedPage() {
  const locale = getServerLocale();
  const sections = [
    { key: "assess", bullets: [1, 2, 3] },
    { key: "safe", bullets: [1, 2, 3] },
    { key: "reporting", bullets: [1, 2, 3] },
    { key: "reminder", bullets: [1, 2] }
  ] as const;

  return (
    <>
      <header className="care-header">
        <h1>{t(locale, "care.pages.animals_in_need.title")}</h1>
        <p className="care-subtitle">
          {t(locale, "care.pages.animals_in_need.intro")}
        </p>
      </header>

      {sections.map((section) => (
        <section key={section.key}>
          <h2>
            {t(
              locale,
              `care.pages.animals_in_need.sections.${section.key}.title`
            )}
          </h2>
          <ul>
            {section.bullets.map((bullet) => (
              <li key={bullet}>
                {t(
                  locale,
                  `care.pages.animals_in_need.sections.${section.key}.bullets.${bullet}`
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
