import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { PolicySettingsForm } from "@/components/admin-settings-forms";
import { loadAdminBusinessSettings } from "@/lib/admin-settings";

export const metadata: Metadata = { title: "Customer policy settings" };

export default async function PolicySettingsPage() {
  const { roles, settings, error } = await loadAdminBusinessSettings();
  return (
    <AdminShell title="Customer policies" roles={roles}>
      <p className="settings-back-row"><Link href="/admin/settings">← All settings</Link></p>
      <p className="form-notice">Policy text appears on customer facing pages. Keep each language version clear and accurate.</p>
      {error ? <p className="form-error" role="alert">Policy settings could not be loaded. Refresh the page before editing.</p> : <PolicySettingsForm settings={settings} />}
    </AdminShell>
  );
}
