import Link from "next/link";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n.server";

export default function CarePage() {
  const locale = getServerLocale();
  const cards = [
    { key: "basics", href: "/care/basics" },
    { key: "need", href: "/care/animals-in-need" },
    { key: "lost", href: "/care/lost-found" },
    { key: "adoption", href: "/care/adoption" },
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
          return (
            <Link className="care-card" href={card.href} key={card.key}>
              <h3>{title}</h3>
              <p>{body}</p>
            </Link>
          );
        })}
      </section>

      <p className="disclaimer">{t(locale, "care.footer.note")}</p>
    </>
  );
}
