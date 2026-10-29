import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { BusinessSettingsForm } from "@/components/admin-settings-forms";
import { loadAdminBusinessSettings } from "@/lib/admin-settings";

export const metadata: Metadata = { title: "Business information settings" };

export default async function BusinessSettingsPage() {
  const { roles, settings, error } = await loadAdminBusinessSettings();
  return (
    <AdminShell title="Business information" roles={roles}>
      <p className="settings-back-row"><Link href="/admin/settings">← All settings</Link></p>
      <p className="form-notice">Manage the public details customers see on the website.</p>
      {error ? <p className="form-error" role="alert">Business information could not be loaded. Refresh the page before editing.</p> : <BusinessSettingsForm settings={settings} />}
    </AdminShell>
  );
}
