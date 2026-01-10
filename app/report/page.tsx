import ReportClient from "./ReportClient";
import { getServerLocale } from "@/lib/i18n.server";

export default function ReportPage() {
  const locale = getServerLocale();
  return <ReportClient locale={locale} />;
}
