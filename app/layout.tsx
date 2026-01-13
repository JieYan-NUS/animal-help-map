import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import LanguageToggle from "@/components/LanguageToggle";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n.server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pawscue – A Community Shield for Animals",
  description:
    "Pawscue is a community-powered platform helping animals in need through shared reports and local action."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const locale = getServerLocale();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const contactEmail = "pawscueglobal@gmail.com";
  return (
    <html lang={locale}>
      <head>
        {gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        ) : null}
      </head>
      <body>
        <nav>
          <Link href="/">{t(locale, "nav.home")}</Link>
          <Link href="/report">{t(locale, "nav.report")}</Link>
          <Link href="/map">{t(locale, "nav.map")}</Link>
          <Link href="/stories">{t(locale, "nav.stories")}</Link>
          <Link href="/care">{t(locale, "nav.care")}</Link>
          <div style={{ marginLeft: "auto" }}>
            <LanguageToggle currentLocale={locale} />
          </div>
        </nav>
        <main>{children}</main>
        <footer className="site-footer">
          <small className="site-footer__contact">
            {t(locale, "footer.contact")}{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </small>
        </footer>
      </body>
    </html>
  );
}
