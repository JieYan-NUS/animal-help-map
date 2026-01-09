import Image from "next/image";
import Link from "next/link";
import { getServerLocale, t } from "@/lib/i18n";

export default function HomePage() {
  const locale = getServerLocale();
  return (
    <>
      <section className="hero">
        <div className="heroFrame">
          <Image
            src="/hero.png"
            alt="A gentle close-up of an animal resting safely"
            fill
            priority
            sizes="100vw"
            className="hero-image"
          />
          <div className="hero-overlay" />
        </div>
        <div className="hero-content heroContent">
          <h1>Pawscue</h1>
          <p className="hero-subtitle">
            {t(locale, "home.heroSubtitle")}
          </p>
          <div className="hero-actions">
            <Link className="button" href="/report">
              {t(locale, "home.reportCta")}
            </Link>
            <Link className="button button-secondary" href="/map">
              {t(locale, "home.mapCta")}
            </Link>
          </div>
        </div>
      </section>
      <h2>{t(locale, "home.sectionTitle")}</h2>
      <p>
        {t(locale, "home.sectionBody")}
      </p>
      <p className="disclaimer">
        {t(locale, "home.disclaimerEmergency")}
      </p>
      <p className="disclaimer">
        {t(locale, "home.disclaimerCredit")}
      </p>
      <footer
        style={{
          marginTop: "2rem",
          fontSize: "0.85rem",
          color: "#6b635b",
          textAlign: "center",
        }}
      >
        {t(locale, "home.footerLead")}
        <Link href="https://www.gnu.org/licenses/agpl-3.0.html">
          GNU AGPL-3.0
        </Link>
        {t(locale, "home.footerTail")}
      </footer>
    </>
  );
}
