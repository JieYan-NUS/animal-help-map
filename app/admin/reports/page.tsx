import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin/auth";
import { logoutAdmin } from "@/app/admin/actions";
import { backfillPendingAddresses } from "@/app/admin/reports/actions";

export const dynamic = "force-dynamic";

type AdminReportsPageProps = {
  searchParams?: { updated?: string };
};

type ReportRow = {
  id: string;
  created_at: string;
  report_type: string | null;
  species: string;
  condition: string;
  description: string | null;
  location_description: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  reporter_contact: string | null;
  status: string | null;
  last_seen_at: string | null;
  expires_at: string | null;
  resolved_at: string | null;
  photo_path: string | null;
};

const statusCopy: Record<string, string> = {
  backfilled: "Addresses backfilled.",
  deleted: "Report deleted.",
  resolved: "Report marked as resolved.",
  error: "We couldn't delete that report. Try again."
};

const formatCoordinates = (report: ReportRow) => {
  if (report.latitude == null || report.longitude == null) {
    return "Not provided";
  }
  return `${report.latitude}, ${report.longitude}`;
};

const buildReportPhotoUrl = (path?: string | null) => {
  if (!path) return null;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return path;
  return `${baseUrl}/storage/v1/object/public/report-photos/${path}`;
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
      "id, created_at, report_type, species, condition, description, location_description, latitude, longitude, reporter_contact, status, last_seen_at, expires_at, resolved_at, photo_path"
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
          <Link className="admin-button" href="/admin">
            Admin home
          </Link>
          <Link className="admin-button" href="/admin/stories">
            Review stories
          </Link>
          <Link
            aria-current="page"
            className="admin-button is-active"
            href="/admin/reports"
          >
            Review reports
          </Link>
          <form action={backfillPendingAddresses}>
            <button className="admin-button" type="submit">
              Backfill pending addresses
            </button>
          </form>
          <form action={logoutAdmin}>
            <button className="admin-button" type="submit">
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
                <span>
                  {report.report_type === "lost" ? "Lost" : "Need help"}
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
                  <dt>Report type</dt>
                  <dd>
                    {report.report_type === "lost" ? "Lost animal" : "Animal in need"}
                  </dd>
                </div>
                <div>
                  <dt>Animal type</dt>
                  <dd>{report.species || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Condition</dt>
                  <dd>{report.condition || "Not provided"}</dd>
                </div>
                {report.report_type === "lost" ? (
                  <div>
                    <dt>Last seen</dt>
                    <dd>
                      {report.last_seen_at
                        ? new Date(report.last_seen_at).toLocaleString()
                        : "Not provided"}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>Contact</dt>
                  <dd>{report.reporter_contact || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Coordinates</dt>
                  <dd>{formatCoordinates(report)}</dd>
                </div>
                {report.report_type === "lost" ? (
                  <div>
                    <dt>Expires</dt>
                    <dd>
                      {report.expires_at
                        ? new Date(report.expires_at).toLocaleString()
                        : "Not set"}
                    </dd>
                  </div>
                ) : null}
                {report.report_type === "lost" ? (
                  <div>
                    <dt>Resolved</dt>
                    <dd>
                      {report.resolved_at
                        ? new Date(report.resolved_at).toLocaleString()
                        : "No"}
                    </dd>
                  </div>
                ) : null}
                {report.report_type === "lost" ? (
                  <div>
                    <dt>Photo</dt>
                    <dd>{buildReportPhotoUrl(report.photo_path) ? "Attached" : "None"}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Status</dt>
                  <dd>{report.status || "Reported"}</dd>
                </div>
              </dl>
              <div className="admin-story-footer">
                <span className="admin-story-slug">{report.id}</span>
                <Link className="button" href={`/admin/reports/${report.id}`}>
                  Review
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
