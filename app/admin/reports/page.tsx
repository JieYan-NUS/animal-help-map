import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin/auth";
import { logoutAdmin } from "@/app/admin/actions";
import { deleteReport } from "@/app/admin/reports/actions";

export const dynamic = "force-dynamic";

type AdminReportsPageProps = {
  searchParams?: { updated?: string };
};

type ReportRow = {
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

const statusCopy: Record<string, string> = {
  deleted: "Report deleted.",
  error: "We couldn't delete that report. Try again."
};

const formatCoordinates = (report: ReportRow) => {
  if (report.latitude == null || report.longitude == null) {
    return "Not provided";
  }
  return `${report.latitude}, ${report.longitude}`;
};

export default async function AdminReportsPage({
  searchParams
}: AdminReportsPageProps) {
  if (!isAdminRequest()) {
    redirect("/admin");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, created_at, species, condition, description, location_description, latitude, longitude, reporter_contact, status"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin reports fetch error:", error);
  }

  const reports = (data as ReportRow[] | null) ?? [];
  const updatedMessage =
    searchParams?.updated && statusCopy[searchParams.updated]
      ? statusCopy[searchParams.updated]
      : null;

  return (
    <>
      <header className="admin-header admin-header-row">
        <div>
          <h1>Report Moderation</h1>
          <p className="admin-subtitle">
            Remove spam or duplicate reports from the public map.
          </p>
        </div>
        <div className="admin-action-buttons">
          <Link className="button button-secondary" href="/admin/stories">
            Review stories
          </Link>
          <form action={logoutAdmin}>
            <button className="button button-secondary" type="submit">
              Log out
            </button>
          </form>
        </div>
      </header>

      {updatedMessage ? (
        <div className="admin-callout" role="status">
          {updatedMessage}
        </div>
      ) : null}

      {reports.length === 0 ? (
        <section className="admin-empty" aria-live="polite">
          <p>No reports yet.</p>
        </section>
      ) : (
        <section className="admin-stories" aria-label="Animal reports">
          {reports.map((report) => (
            <article className="admin-story-card" key={report.id}>
              <div className="admin-story-meta">
                <span className="admin-status">
                  {report.status || "Reported"}
                </span>
                <span>{report.species}</span>
                <span>{report.condition}</span>
                <span>{new Date(report.created_at).toLocaleString()}</span>
              </div>
              <h2 className="admin-story-title">
                {report.location_description || "Location not provided"}
              </h2>
              <p className="admin-story-excerpt">
                {report.description || "No description provided."}
              </p>
              <dl className="admin-meta-list">
                <div>
                  <dt>Contact</dt>
                  <dd>{report.reporter_contact || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Coordinates</dt>
                  <dd>{formatCoordinates(report)}</dd>
                </div>
              </dl>
              <div className="admin-story-footer">
                <span className="admin-story-slug">{report.id}</span>
                <form action={deleteReport}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <button className="button button-secondary" type="submit">
                    Delete
                  </button>
                </form>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
