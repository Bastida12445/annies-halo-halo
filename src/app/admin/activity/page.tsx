import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { requireStaff } from "@/lib/auth";
import { formatDateTime } from "@/lib/money";

export const metadata: Metadata = { title: "Recent activities" };

function humanize(value: string) {
  return value
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export default async function AdminActivityPage() {
  const { supabase, roles } = await requireStaff(["administrator"]);
  const { data: activities, error } = await supabase
    .from("audit_logs")
    .select("id,action,entity_type,entity_id,details,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <AdminShell title="Recent activities" roles={roles}>
      <div className="content-card">
        <h2>Business activity log</h2>
        <p className="muted">The latest recorded order, reservation, payment, and settings events.</p>
        {error ? (
          <p className="form-error">Activity records could not be loaded. Try again shortly.</p>
        ) : activities?.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Activity</th><th>Record</th><th>Reference</th><th>Date</th></tr></thead>
              <tbody>
                {activities.map((activity) => {
                  const details = activity.details && typeof activity.details === "object"
                    ? activity.details as Record<string, unknown>
                    : {};
                  const reference = typeof details.reference === "string"
                    ? details.reference
                    : typeof details.order_reference === "string"
                      ? details.order_reference
                      : activity.entity_id?.slice(0, 12) ?? "—";
                  return (
                    <tr key={activity.id}>
                      <td>{humanize(activity.action)}</td>
                      <td>{humanize(activity.entity_type)}</td>
                      <td>{reference}</td>
                      <td>{formatDateTime(activity.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p>No activity has been recorded yet.</p>}
      </div>
    </AdminShell>
  );
}
