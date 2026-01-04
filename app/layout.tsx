import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Animal Help Map",
  description: "Report animals in need and find nearby help."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/report">Report</Link>
          <Link href="/map">Map</Link>
          <Link href="/stories">Stories</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
