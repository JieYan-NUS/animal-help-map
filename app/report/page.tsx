import ReportClient from "./ReportClient";
import { getServerLocale } from "@/lib/i18n";

export default function ReportPage() {
  const locale = getServerLocale();
  return <ReportClient locale={locale} />;
}
