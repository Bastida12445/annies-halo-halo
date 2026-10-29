import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { CustomerNavigation } from "@/components/customer-navigation";
import { T } from "@/components/language-provider";

export function CustomerWorkspace({
  children,
  email,
}: {
  children: ReactNode;
  email: string;
}) {
  return (
    <div className="admin-workspace customer-workspace">
      <aside className="admin-rail">
        <Link className="admin-brand" href="/account">
          <span className="admin-brand-mark" aria-hidden="true">A</span>
          <span className="admin-brand-copy">
            <strong>Annie’s</strong>
            <small><T en="CUSTOMER ACCOUNT" fil="ACCOUNT NG CUSTOMER" /></small>
          </span>
        </Link>

        <div className="admin-rail-label"><T en="MY SPACE" fil="AKING SPACE" /></div>
        <CustomerNavigation />

        <div className="admin-rail-footer">
          <span className="admin-rail-label"><T en="SIGNED IN" fil="NAKA-LOG IN" /></span>
          <strong className="admin-rail-email">{email || <T en="Customer account" fil="Account ng customer" />}</strong>
          <Link className="admin-store-link" href="/menu">
            <T en="Browse the menu" fil="Tingnan ang menu" /> <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </aside>

      <div className="admin-workspace-main">
        <header className="admin-toolbar">
          <div>
            <span className="admin-toolbar-kicker">ANNIE’S HALO HALO</span>
            <strong><T en="Customer dashboard" fil="Dashboard ng customer" /></strong>
          </div>
          <form action={logoutAction}>
            <button className="admin-signout" type="submit">
              <T en="Sign out" fil="Mag-log out" />
            </button>
          </form>
        </header>
        <div className="admin-workspace-content customer-workspace-content">{children}</div>
      </div>
    </div>
  );
}
