import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n.server";

export default function CareLibraryPage() {
  const locale = getServerLocale();
  const cards = [
    { key: "species" },
    { key: "health" },
    { key: "behavior" },
    { key: "resources" }
  ] as const;

  return (
    <>
      <header className="care-header">
        <h1>{t(locale, "care.library.page.title")}</h1>
        <p className="care-subtitle">{t(locale, "care.library.page.subtitle")}</p>
      </header>

      <section
        className="care-grid"
        aria-label={t(locale, "care.library.page.title")}
      >
        {cards.map((card) => {
          const title = t(locale, `care.library.cards.${card.key}.title`);
          const body = t(locale, `care.library.cards.${card.key}.body`);
          return (
            <div className="care-card is-disabled" key={card.key}>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          );
        })}
      </section>

      <p className="disclaimer">{t(locale, "care.footer.note")}</p>
    </>
  );
}
