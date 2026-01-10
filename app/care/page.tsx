import Link from "next/link";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n.server";

export default function CarePage() {
  const locale = getServerLocale();
  const cards = [
    { key: "basics" },
    { key: "need" },
    { key: "lost" },
    { key: "adoption" },
    { key: "library", href: "/care/library" }
  ] as const;

  return (
    <>
      <header className="care-header">
        <h1>{t(locale, "care.page.title")}</h1>
        <p className="care-subtitle">{t(locale, "care.page.subtitle")}</p>
      </header>

      <section className="care-grid" aria-label={t(locale, "care.page.title")}>
        {cards.map((card) => {
          const title = t(locale, `care.cards.${card.key}.title`);
          const body = t(locale, `care.cards.${card.key}.body`);
          if ("href" in card) {
            return (
              <Link className="care-card" href={card.href} key={card.key}>
                <h3>{title}</h3>
                <p>{body}</p>
              </Link>
            );
          }
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
