import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { OrderingSettingsForm } from "@/components/admin-settings-forms";
import { loadAdminBusinessSettings } from "@/lib/admin-settings";
import { getEnabledPayMongoChannels } from "@/lib/paymongo-config";

export const metadata: Metadata = { title: "Orders and payments settings" };

export default async function OrderingSettingsPage() {
  const [{ roles, settings, error }, paymongoChannels] = await Promise.all([
    loadAdminBusinessSettings(),
    Promise.resolve(getEnabledPayMongoChannels()),
  ]);
  return (
    <AdminShell title="Orders and payments" roles={roles}>
      <p className="settings-back-row"><Link href="/admin/settings">← All settings</Link></p>
      <p className="form-notice">These options control which orders customers can submit. Use only payment channels and delivery areas the business has confirmed.</p>
      {error ? <p className="form-error" role="alert">Order settings could not be loaded. Refresh the page before editing.</p> : <OrderingSettingsForm settings={settings} paymongoChannels={paymongoChannels} />}
    </AdminShell>
  );
}
