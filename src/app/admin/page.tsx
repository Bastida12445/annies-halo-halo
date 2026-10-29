import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { requireStaff } from "@/lib/auth";
import { formatDateTime, formatPhp } from "@/lib/money";

export const metadata: Metadata = { title: "Admin overview" };

function dateStart(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const timestamp = Date.parse(`${value}T00:00:00+08:00`);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function dateEndExclusive(value: string | string[] | undefined) {
  const start = dateStart(value);
  return start ? new Date(Date.parse(start) + 86_400_000).toISOString() : null;
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  const from = dateStart(params.from);
  const to = dateEndExclusive(params.to);
  const { supabase, roles } = await requireStaff(["administrator"]);
  const [{ data: metrics, error }, { data: activity }, { count: products }] =
    await Promise.all([
      supabase.rpc("get_admin_metrics", { p_from: from, p_to: to }),
      supabase
        .from("audit_logs")
        .select("id,action,entity_type,entity_id,created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("products").select("id", { count: "exact", head: true }),
    ]);
  const stats = metrics?.[0];
  return (
    <AdminShell title="Business overview" roles={roles}>
      <form method="get" className="filter-bar">
        <label className="field-label">
          From
          <input
            type="date"
            name="from"
            defaultValue={typeof params.from === "string" ? params.from : ""}
          />
        </label>
        <label className="field-label">
          Through
          <input
            type="date"
            name="to"
            defaultValue={typeof params.to === "string" ? params.to : ""}
          />
        </label>
        <button className="button button-small">Apply dates</button>
        <Link className="text-link" href="/admin">
          All time
        </Link>
      </form>
      {error || !stats ? (
        <p className="form-notice">
          The dashboard metrics could not be loaded. Confirm that the Supabase
          migration has been applied.
        </p>
      ) : (
        <div className="account-grid dashboard-metrics">
          <div className="metric-card">
            <span>Orders received</span>
            <strong>{stats.total_orders}</strong>
          </div>
          <div className="metric-card">
            <span>Pending confirmation</span>
            <strong>{stats.pending_orders}</strong>
          </div>
          <div className="metric-card">
            <span>Confirmed</span>
            <strong>{stats.confirmed_orders}</strong>
          </div>
          <div className="metric-card">
            <span>Being prepared</span>
            <strong>{stats.preparing_orders}</strong>
          </div>
          <div className="metric-card">
            <span>Ready for pickup</span>
            <strong>{stats.ready_for_pickup_orders}</strong>
          </div>
          <div className="metric-card">
            <span>Out for delivery</span>
            <strong>{stats.out_for_delivery_orders}</strong>
          </div>
          <div className="metric-card">
            <span>Completed</span>
            <strong>{stats.completed_orders}</strong>
          </div>
          <div className="metric-card">
            <span>Cancelled</span>
            <strong>{stats.cancelled_orders}</strong>
          </div>
          <div className="metric-card">
            <span>Pending reservations</span>
            <strong>{stats.pending_reservations}</strong>
          </div>
          <div className="metric-card">
            <span>Confirmed reservations</span>
            <strong>{stats.confirmed_reservations}</strong>
          </div>
          <div className="metric-card">
            <span>Paid sales</span>
            <strong>{formatPhp(stats.paid_sales_cents)}</strong>
            <small>Verified paid records only</small>
          </div>
          <div className="metric-card">
            <span>Unpaid order totals</span>
            <strong>{formatPhp(stats.unpaid_order_cents)}</strong>
          </div>
          <div className="metric-card">
            <span>Unavailable active products</span>
            <strong>{stats.unavailable_products}</strong>
          </div>
          <div className="metric-card">
            <span>Menu products</span>
            <strong>{products ?? 0}</strong>
          </div>
        </div>
      )}
      <div className="content-card">
        <h2>Recent activity</h2>
        {activity?.length ? (
          <ul className="history-list">
            {activity.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.action.replaceAll("_", " ")}</strong> ·{" "}
                {entry.entity_type}
                {entry.entity_id
                  ? ` ${entry.entity_id.slice(0, 12)}`
                  : ""} · {formatDateTime(entry.created_at)}
              </li>
            ))}
          </ul>
        ) : (
          <p>No activity has been recorded.</p>
        )}
      </div>
      <div className="content-card">
        <h2>Tasks</h2>
        <div className="button-row">
          <Link className="button" href="/admin/orders">
            Review orders
          </Link>
          <Link className="button button-secondary" href="/admin/products">
            Update the menu
          </Link>
          <Link className="button button-secondary" href="/admin/settings">
            Configure the business
          </Link>
        </div>
      </div>
      <p className="field-help">
        Paid sales exclude unpaid and cancelled orders. The current cash
        workflow does not record collection, so cash orders are not counted as
        paid.
      </p>
    </AdminShell>
  );
}
