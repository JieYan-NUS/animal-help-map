import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n.server";

export default function CareAdoptionPage() {
  const locale = getServerLocale();
  const sections = [
    { key: "decide", bullets: [1, 2, 3] },
    { key: "prepare", bullets: [1, 2, 3] },
    { key: "long_term", bullets: [1, 2, 3] }
  ] as const;

  return (
    <>
      <header className="care-header">
        <h1>{t(locale, "care.pages.adoption.title")}</h1>
        <p className="care-subtitle">{t(locale, "care.pages.adoption.intro")}</p>
      </header>

      {sections.map((section) => (
        <section key={section.key}>
          <h2>{t(locale, `care.pages.adoption.sections.${section.key}.title`)}</h2>
          <ul>
            {section.bullets.map((bullet) => (
              <li key={bullet}>
                {t(
                  locale,
                  `care.pages.adoption.sections.${section.key}.bullets.${bullet}`
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p>{t(locale, "care.pages.adoption.note")}</p>
    </>
  );
}
