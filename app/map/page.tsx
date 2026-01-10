import dynamic from "next/dynamic";
import { getServerLocale } from "@/lib/i18n.server";

const MapClient = dynamic(() => import("./MapClient"), { ssr: false });

export default function MapPage() {
  const locale = getServerLocale();
  return <MapClient locale={locale} />;
}
