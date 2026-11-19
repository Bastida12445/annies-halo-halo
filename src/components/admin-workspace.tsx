"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, ChartNoAxesColumnIncreasing, ChevronDown, LogOut, Search } from "lucide-react";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { AdminNavigation } from "@/components/admin-navigation";
import type { StaffRole } from "@/types/database";

const roleLabels: Record<StaffRole, string> = {
  administrator: "Administrator",
  order_manager: "Order manager",
  menu_manager: "Menu manager",
  reservation_manager: "Reservation manager",
};

export function AdminWorkspace({
  children,
  email,
  roles,
}: {
  children: ReactNode;
  email: string;
  roles: StaffRole[];
}) {
  const primaryRole: StaffRole = roles.includes("administrator") ? "administrator" : roles[0] ?? "order_manager";
  const initials = email.trim().slice(0, 1).toUpperCase() || "A";
  const canManageMenu = roles.some((role) => role === "administrator" || role === "menu_manager");
  const panelHref = roles.includes("administrator")
    ? "/admin"
    : roles.includes("menu_manager")
      ? "/admin/products"
      : roles.includes("order_manager")
        ? "/admin/orders"
        : "/admin/reservations";

  return (
    <div className="admin-workspace">
      <aside className="admin-rail">
        <Link className="admin-brand" href="/admin">
          <span className="admin-brand-mark">
            <Image alt="" height={58} src="/images/customer-dashboard/halo-halo-hero.jpg" width={58} />
          </span>
          <span className="admin-brand-copy">
            <strong>Annie&apos;s</strong>
            <span>HALO HALO</span>
          </span>
        </Link>

        <div className="admin-rail-label">BUSINESS ADMIN</div>
        <AdminNavigation roles={roles} />

        <div className="admin-rail-footer">
          <p className="admin-sidebar-slogan">Life is sweeter<br />with Annie&apos;s!<span aria-hidden="true">♡</span></p>
          <Link className="admin-store-link" href="/">View storefront <span aria-hidden="true">↗</span></Link>
          <form action={logoutAction}>
            <button className="admin-sidebar-logout" type="submit"><LogOut aria-hidden="true" size={18} />Log out</button>
          </form>
        </div>
      </aside>

      <div className="admin-workspace-main">
        <header className="admin-toolbar">
          <div>
            <span className="admin-toolbar-kicker">ANNIE&apos;S HALO HALO</span>
            <strong>Management dashboard</strong>
          </div>
          <div className="admin-toolbar-actions">
            {canManageMenu && <form action="/admin/products" className="admin-toolbar-search" role="search"><Search aria-hidden="true" size={17} /><label className="sr-only" htmlFor="admin-global-search">Search menu products</label><input id="admin-global-search" name="q" placeholder="Search menu products..." type="search" /><button aria-label="Search products" type="submit"><Search aria-hidden="true" size={15} /></button></form>}
            {roles.includes("administrator") && <Link aria-label="Recent activity" className="admin-notification-link" href="/admin/activity"><Bell aria-hidden="true" size={19} /><span className="sr-only">Recent activity</span></Link>}
            <Link className="admin-panel-badge" href={panelHref}><ChartNoAxesColumnIncreasing aria-hidden="true" size={16} />Admin Panel</Link>
            <span aria-hidden="true" className="admin-toolbar-separator" />
            <details className="admin-user-menu">
              <summary aria-label={`Account menu for ${roleLabels[primaryRole]}`}>
                <span className="admin-user-avatar" aria-hidden="true">{initials}</span>
                <span className="admin-user-role">{roleLabels[primaryRole]}</span>
                <ChevronDown aria-hidden="true" size={15} />
              </summary>
              <div className="admin-user-dropdown">
                <span className="admin-dropdown-email">{email || "Staff account"}</span>
                <Link href="/">View storefront</Link>
                <form action={logoutAction}>
                  <button type="submit"><LogOut aria-hidden="true" size={16} />Log out</button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <div className="admin-workspace-content">{children}</div>
      </div>
    </div>
  );
}
