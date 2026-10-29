import type { ReactNode } from "react";
import type { StaffRole } from "@/types/database";

const roleLabels: Record<StaffRole, string> = {
  administrator: "Administrator",
  order_manager: "Order manager",
  menu_manager: "Menu manager",
  reservation_manager: "Reservation manager",
};

export function AdminShell({
  title,
  roles,
  children,
}: {
  title: string;
  roles: StaffRole[];
  children: ReactNode;
}) {
  return (
    <section className="admin-page">
      <header className="admin-page-heading">
        <div>
          <span className="admin-page-kicker">Business management</span>
          <h1>{title}</h1>
        </div>
        <div className="admin-role-badges" aria-label="Your staff roles">
          {roles.map((role) => (
            <span className="admin-role-badge" key={role}>
              {roleLabels[role]}
            </span>
          ))}
        </div>
      </header>
      <div className="admin-page-content">{children}</div>
    </section>
  );
}
