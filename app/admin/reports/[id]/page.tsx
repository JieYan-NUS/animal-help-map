import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin/auth";
import { logoutAdmin } from "@/app/admin/actions";
import { deleteReport, markReportResolved } from "@/app/admin/reports/actions";

export const dynamic = "force-dynamic";

type AdminReportDetailPageProps = {
  params: { id: string };
};

type ReportDetail = {
  id: string;
  created_at: string;
  report_type: string | null;
  species: string;
  condition: string;
  description: string | null;
  location_description: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  address: string | null;
  address_source: string | null;
  reporter_contact: string | null;
  status: string | null;
  last_seen_at: string | null;
  expires_at: string | null;
  resolved_at: string | null;
  photo_path: string | null;
};

const formatAddress = (report: ReportDetail) =>
  report.address?.trim() ||
  report.location_description?.trim() ||
  "Not provided";

const buildReportPhotoUrl = (path?: string | null) => {
  if (!path) return null;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return path;
  return `${baseUrl}/storage/v1/object/public/report-photos/${path}`;
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
      "id, created_at, report_type, species, condition, description, location_description, latitude, longitude, address, address_source, reporter_contact, status, last_seen_at, expires_at, resolved_at, photo_path"
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
  const isLost = report.report_type === "lost";
  const photoUrl = buildReportPhotoUrl(report.photo_path);

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
            <span>{isLost ? "Lost" : "Need help"}</span>
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
          {isLost && photoUrl ? (
            <div style={{ marginTop: 16 }}>
              <img
                src={photoUrl}
                alt={`Lost ${report.species}`}
                style={{
                  width: "100%",
                  maxWidth: 420,
                  borderRadius: 12,
                  border: "1px solid #f1d0d0"
                }}
              />
            </div>
          ) : null}
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
                <dt>Report type</dt>
                <dd>{isLost ? "Lost animal" : "Animal in need"}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{report.reporter_contact || "Not provided"}</dd>
              </div>
              {isLost ? (
                <div>
                  <dt>Last seen</dt>
                  <dd>
                    {report.last_seen_at
                      ? new Date(report.last_seen_at).toLocaleString()
                      : "Not provided"}
                  </dd>
                </div>
              ) : null}
              {isLost ? (
                <div>
                  <dt>Expires</dt>
                  <dd>
                    {report.expires_at
                      ? new Date(report.expires_at).toLocaleString()
                      : "Not set"}
                  </dd>
                </div>
              ) : null}
              {isLost ? (
                <div>
                  <dt>Resolved</dt>
                  <dd>
                    {report.resolved_at
                      ? new Date(report.resolved_at).toLocaleString()
                      : "No"}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Address</dt>
                <dd>{formatAddress(report)}</dd>
              </div>
              {isLost ? (
                <div>
                  <dt>Photo</dt>
                  <dd>{photoUrl ? "Attached" : "None"}</dd>
                </div>
              ) : null}
              <div>
                <dt>Status</dt>
                <dd>{report.status || "Reported"}</dd>
              </div>
            </dl>
          </div>

          <div className="admin-panel admin-actions">
            <h2>Moderation</h2>
            {isLost && !report.resolved_at ? (
              <form action={markReportResolved}>
                <input type="hidden" name="reportId" value={report.id} />
                <button className="button button-secondary" type="submit">
                  Mark as found
                </button>
              </form>
            ) : null}
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
