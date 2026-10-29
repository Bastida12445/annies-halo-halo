import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Business settings" };

const settingsSections = [
  {
    href: "/admin/settings/business",
    title: "Business information",
    description: "Name, description, contact details, hours, social links, and announcements.",
  },
  {
    href: "/admin/settings/ordering",
    title: "Orders and payments",
    description: "Pickup, delivery areas, minimum order, preparation times, and payment options.",
  },
  {
    href: "/admin/settings/reservations",
    title: "Reservations",
    description: "Turn requests on or off and manage reservation types, time slots, and cancellation timing.",
  },
  {
    href: "/admin/settings/policies",
    title: "Customer policies",
    description: "Edit privacy, terms, refunds, ordering, and reservation copy in English and Filipino.",
  },
];

export default async function AdminSettingsPage() {
  const { roles } = await requireStaff(["administrator"]);

  return (
    <AdminShell title="Business settings" roles={roles}>
      <p className="form-notice">
        Choose a section to review or update. Each page saves only its own settings, so the other sections stay as they are.
      </p>
      <nav className="settings-feature-grid" aria-label="Business settings sections">
        {settingsSections.map((section) => (
          <Link className="settings-feature-card" href={section.href} key={section.href}>
            <strong>{section.title}</strong>
            <span>{section.description}</span>
            <span className="settings-feature-link">Open settings <span aria-hidden="true">&gt;</span></span>
          </Link>
        ))}
      </nav>
    </AdminShell>
  );
}
