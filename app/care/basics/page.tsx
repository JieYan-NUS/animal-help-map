import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n.server";

export default function CareBasicsPage() {
  const locale = getServerLocale();
  const sections = [
    { key: "before", bullets: [1, 2, 3] },
    { key: "simple_help", bullets: [1, 2, 3] },
    { key: "avoid", bullets: [1, 2, 3] },
    { key: "seek_help", bullets: [1, 2, 3] }
  ] as const;

  return (
    <>
      <header className="care-header">
        <h1>{t(locale, "care.pages.basics.title")}</h1>
        <p className="care-subtitle">{t(locale, "care.pages.basics.intro")}</p>
      </header>

      {sections.map((section) => (
        <section key={section.key}>
          <h2>{t(locale, `care.pages.basics.sections.${section.key}.title`)}</h2>
          <ul>
            {section.bullets.map((bullet) => (
              <li key={bullet}>
                {t(
                  locale,
                  `care.pages.basics.sections.${section.key}.bullets.${bullet}`
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p>{t(locale, "care.pages.basics.note")}</p>
    </>
  );
}
