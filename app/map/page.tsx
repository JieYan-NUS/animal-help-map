import dynamic from "next/dynamic";
import { getServerLocale } from "@/lib/i18n";

const MapClient = dynamic(() => import("./MapClient"), { ssr: false });

export default function MapPage() {
  const locale = getServerLocale();
  return <MapClient locale={locale} />;
}
