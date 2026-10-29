import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { requireStaff } from "@/lib/auth";
import { formatDateTime, formatPhp } from "@/lib/money";
import type { OrderStatus } from "@/types/database";

export const metadata: Metadata = { title: "Orders" };
const statuses: OrderStatus[] = [
  "pending_confirmation",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
];
const payments = ["unpaid", "pending", "paid", "failed", "refunded"] as const;
const fulfillments = ["pickup", "delivery"] as const;

function isDate(value: string | string[] | undefined): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00+08:00`))
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  const params = await searchParams;
  const q =
    typeof params.q === "string"
      ? params.q
          .toUpperCase()
          .replace(/[^A-Z0-9-]/g, "")
          .slice(0, 32)
      : "";
  const status = statuses.includes(params.status as OrderStatus)
    ? (params.status as OrderStatus)
    : "";
  const payment = payments.includes(params.payment as (typeof payments)[number])
    ? (params.payment as (typeof payments)[number])
    : "";
  const fulfillment = fulfillments.includes(
    params.fulfillment as (typeof fulfillments)[number],
  )
    ? (params.fulfillment as (typeof fulfillments)[number])
    : "";
  const from = isDate(params.from) ? `${params.from}T00:00:00+08:00` : "";
  const to = isDate(params.to)
    ? new Date(
        Date.parse(`${params.to}T00:00:00+08:00`) + 86_400_000,
      ).toISOString()
    : "";
  const page = Math.max(
    1,
    Math.min(
      1000,
      Number.parseInt(
        typeof params.page === "string" ? params.page : "1",
        10,
      ) || 1,
    ),
  );
  const pageSize = 50;
  const { supabase, roles } = await requireStaff(["administrator", "order_manager"]);
  let query = supabase
    .from("orders")
    .select(
      "id,order_reference,customer_id,customer_phone,fulfillment_method,order_status,payment_status,total_cents,created_at",
    )
    .order("created_at", { ascending: false });
  if (q) query = query.ilike("order_reference", `%${q}%`);
  if (status) query = query.eq("order_status", status);
  if (payment) query = query.eq("payment_status", payment);
  if (fulfillment) query = query.eq("fulfillment_method", fulfillment);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lt("created_at", to);
  const { data: orders, error } = await query.range(
    (page - 1) * pageSize,
    page * pageSize - 1,
  );
  const pageUrl = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({
      q,
      status,
      payment,
      fulfillment,
      from: isDate(params.from) ? params.from : "",
      to: isDate(params.to) ? params.to : "",
    }))
      if (value) next.set(key, value);
    next.set("page", String(target));
    return `/admin/orders?${next.toString()}`;
  };

  return (
    <AdminShell title="Orders" roles={roles}>
      <form method="get" className="filter-bar">
        <label className="field-label">
          Reference
          <input name="q" defaultValue={q} maxLength={32} placeholder="HH-…" />
        </label>
        <label className="field-label">
          Order status
          <select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {statuses.map((value) => (
              <option value={value} key={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Payment
          <select name="payment" defaultValue={payment}>
            <option value="">All payments</option>
            {payments.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Fulfillment
          <select name="fulfillment" defaultValue={fulfillment}>
            <option value="">All methods</option>
            {fulfillments.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          From
          <input
            type="date"
            name="from"
            defaultValue={isDate(params.from) ? params.from : ""}
          />
        </label>
        <label className="field-label">
          Through
          <input
            type="date"
            name="to"
            defaultValue={isDate(params.to) ? params.to : ""}
          />
        </label>
        <button className="button button-small">Search & filter</button>
        <Link className="text-link" href="/admin/orders">
          Clear
        </Link>
      </form>
      {error && (
        <p className="form-error" role="alert">
          Orders could not be loaded. Verify the database migration and staff
          access.
        </p>
      )}
      {!error && orders?.length ? (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Fulfillment</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.order_reference}</td>
                    <td>
                      <span title={order.customer_id}>
                        {order.customer_id.slice(0, 8)}
                      </span>
                      {order.customer_phone && (
                        <small className="table-subline">
                          {order.customer_phone}
                        </small>
                      )}
                    </td>
                    <td>{formatDateTime(order.created_at)}</td>
                    <td>{order.fulfillment_method}</td>
                    <td>
                      <span className="status-badge">
                        {order.order_status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>{order.payment_status}</td>
                    <td>{formatPhp(order.total_cents)}</td>
                    <td>
                      <Link
                        className="text-link"
                        href={`/admin/orders/${order.id}`}
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>Page {page}</span>
            {page > 1 && (
              <Link
                className="button button-small button-secondary"
                href={pageUrl(page - 1)}
              >
                Previous
              </Link>
            )}
            {orders.length === pageSize && (
              <Link className="button button-small" href={pageUrl(page + 1)}>
                Next
              </Link>
            )}
          </div>
        </>
      ) : !error ? (
        <div className="empty-state">
          <h2>No matching orders</h2>
          <p>Try a different reference, date range, or status.</p>
        </div>
      ) : null}
    </AdminShell>
  );
}
