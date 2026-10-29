import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { AdminNavigation } from "@/components/admin-navigation";
import type { StaffRole } from "@/types/database";

export function AdminWorkspace({
  children,
  email,
  roles,
}: {
  children: ReactNode;
  email: string;
  roles: StaffRole[];
}) {
  return (
    <div className="admin-workspace">
      <aside className="admin-rail">
        <Link className="admin-brand" href="/admin">
          <span className="admin-brand-mark" aria-hidden="true">A</span>
          <span className="admin-brand-copy">
            <strong>Annie’s</strong>
            <small>BUSINESS ADMIN</small>
          </span>
        </Link>

        <div className="admin-rail-label">WORKSPACE</div>
        <AdminNavigation roles={roles} />

        <div className="admin-rail-footer">
          <span className="admin-rail-label">SIGNED IN</span>
          <strong className="admin-rail-email">{email || "Staff account"}</strong>
          <Link className="admin-store-link" href="/">
            View storefront <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </aside>

      <div className="admin-workspace-main">
        <header className="admin-toolbar">
          <div>
            <span className="admin-toolbar-kicker">ANNIE’S HALO HALO</span>
            <strong>Management dashboard</strong>
          </div>
          <form action={logoutAction}>
            <button className="admin-signout" type="submit">Sign out</button>
          </form>
        </header>
        <div className="admin-workspace-content">{children}</div>
      </div>
    </div>
  );
}
