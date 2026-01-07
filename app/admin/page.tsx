import Link from "next/link";
import { loginAdmin, logoutAdmin } from "@/app/admin/actions";
import { isAdminRequest } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: { error?: string };
};

export default function AdminPage({ searchParams }: AdminPageProps) {
  if (isAdminRequest()) {
    return (
      <>
        <header className="admin-header">
          <h1>Admin Review</h1>
          <p className="admin-subtitle">
            Choose an area to review community submissions.
          </p>
        </header>

        <div className="admin-action-buttons">
          <Link
            aria-current="page"
            className="admin-button is-active"
            href="/admin"
          >
            Admin home
          </Link>
          <Link className="admin-button" href="/admin/stories">
            Review stories
          </Link>
          <Link className="admin-button" href="/admin/reports">
            Review reports
          </Link>
          <form action={logoutAdmin}>
            <button className="admin-button" type="submit">
              Log out
            </button>
          </form>
        </div>
      </>
    );
  }

  const hasError = searchParams?.error === "1";

  return (
    <>
      <header className="admin-header">
        <h1>Admin Review</h1>
        <p className="admin-subtitle">
          Sign in to review and publish community stories.
        </p>
      </header>

      <form className="form admin-form" action={loginAdmin}>
        <div className="field">
          <label htmlFor="admin-password">Admin password</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          {hasError ? (
            <p className="error">That password didn&apos;t match.</p>
          ) : null}
        </div>
        <button className="button" type="submit">
          Sign in
        </button>
      </form>
    </>
  );
}
