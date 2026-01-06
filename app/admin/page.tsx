import { redirect } from "next/navigation";
import { loginAdmin } from "@/app/admin/actions";
import { isAdminRequest } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: { error?: string };
};

export default function AdminPage({ searchParams }: AdminPageProps) {
  if (isAdminRequest()) {
    redirect("/admin/stories");
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
