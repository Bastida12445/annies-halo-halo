import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { ReservationSettingsForm } from "@/components/admin-settings-forms";
import { loadAdminBusinessSettings } from "@/lib/admin-settings";

export const metadata: Metadata = { title: "Reservation settings" };

export default async function ReservationSettingsPage() {
  const { roles, settings, error } = await loadAdminBusinessSettings();
  return (
    <AdminShell title="Reservations" roles={roles}>
      <p className="settings-back-row"><Link href="/admin/settings">← All settings</Link></p>
      <p className="form-notice">Reservation requests stay unavailable to customers until enabled here and at least one reservation type is enabled.</p>
      {error ? <p className="form-error" role="alert">Reservation settings could not be loaded. Refresh the page before editing.</p> : <ReservationSettingsForm settings={settings} />}
    </AdminShell>
  );
}
