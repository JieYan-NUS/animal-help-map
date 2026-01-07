import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin/auth";
import { logoutAdmin } from "@/app/admin/actions";
import { deleteReport } from "@/app/admin/reports/actions";

export const dynamic = "force-dynamic";

type AdminReportDetailPageProps = {
  params: { id: string };
};

type ReportDetail = {
  id: string;
  created_at: string;
  species: string;
  condition: string;
  description: string | null;
  location_description: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  reporter_contact: string | null;
  status: string | null;
};

const formatCoordinates = (report: ReportDetail) => {
  if (report.latitude == null || report.longitude == null) {
    return "Not provided";
  }
  return `${report.latitude}, ${report.longitude}`;
};

export default async function AdminReportDetailPage({
  params
}: AdminReportDetailPageProps) {
  if (!isAdminRequest()) {
    redirect("/admin");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, created_at, species, condition, description, location_description, latitude, longitude, reporter_contact, status"
    )
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return (
      <>
        <Link className="story-back" href="/admin/reports">
          Back to reports
        </Link>
        <section className="admin-empty" aria-live="polite">
          <p>Report not found.</p>
        </section>
      </>
    );
  }

  const report = data as ReportDetail;

  return (
    <>
      <header className="admin-header admin-header-row">
        <div>
          <Link className="story-back" href="/admin/reports">
            Back to reports
          </Link>
          <h1>Report review</h1>
          <div className="admin-story-meta">
            <span className="admin-status">
              {report.status || "Reported"}
            </span>
            <span>{report.species}</span>
            <span>{report.condition}</span>
            <span>{new Date(report.created_at).toLocaleString()}</span>
          </div>
        </div>
        <form action={logoutAdmin}>
          <button className="button button-secondary" type="submit">
            Log out
          </button>
        </form>
      </header>

      <section className="admin-story-detail">
        <div className="admin-story-card">
          <h2 className="admin-story-title">
            {report.location_description || "Location not provided"}
          </h2>
          <p className="admin-story-excerpt">
            {report.description || "No description provided."}
          </p>
        </div>

        <aside className="admin-sidebar">
          <div className="admin-panel">
            <h2>Report details</h2>
            <dl className="admin-meta-list">
              <div>
                <dt>Created</dt>
                <dd>{new Date(report.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Species</dt>
                <dd>{report.species || "Not provided"}</dd>
              </div>
              <div>
                <dt>Condition</dt>
                <dd>{report.condition || "Not provided"}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{report.reporter_contact || "Not provided"}</dd>
              </div>
              <div>
                <dt>Coordinates</dt>
                <dd>{formatCoordinates(report)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{report.status || "Reported"}</dd>
              </div>
            </dl>
          </div>

          <div className="admin-panel admin-actions">
            <h2>Moderation</h2>
            <form action={deleteReport}>
              <input type="hidden" name="reportId" value={report.id} />
              <button className="button" type="submit">
                Delete report
              </button>
            </form>
          </div>
        </aside>
      </section>
    </>
  );
}
