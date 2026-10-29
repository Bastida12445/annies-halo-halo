import Link from "next/link";
import type { Metadata } from "next";
import { T } from "@/components/language-provider";
import { requireCustomer } from "@/lib/auth";
import { formatDateTime, formatPhp } from "@/lib/money";
import { getSupabaseConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Order history" };

export default async function OrdersPage() {
  if (!getSupabaseConfig())
    return (
      <section className="customer-account-page">
        <div className="form-shell">
          <h1>
            <T
              en="Order history is unavailable"
              fil="Hindi available ang order history"
            />
          </h1>
        </div>
      </section>
    );
  const { supabase, user } = await requireCustomer("/account/orders");
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return (
    <section className="customer-account-page">
      <span className="eyebrow">
        <T en="Customer account" fil="Account ng customer" />
      </span>
      <h1>
        <T en="Your orders" fil="Iyong mga order" />
      </h1>
      {error && (
        <p className="form-error" role="alert">
          <T
            en="Orders could not be loaded."
            fil="Hindi ma-load ang mga order."
          />
        </p>
      )}
      {!error && orders?.length ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <T en="Reference" fil="Reference" />
                </th>
                <th>
                  <T en="Placed" fil="Petsa" />
                </th>
                <th>
                  <T en="Status" fil="Status" />
                </th>
                <th>
                  <T en="Payment" fil="Bayad" />
                </th>
                <th>
                  <T en="Total" fil="Kabuuan" />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.order_reference}</td>
                  <td>{formatDateTime(order.created_at)}</td>
                  <td>
                    <span className="status-badge">
                      {order.order_status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge status-badge-warning">
                      {order.payment_status}
                    </span>
                  </td>
                  <td>{formatPhp(order.total_cents)}</td>
                  <td>
                    <Link
                      className="text-link"
                      href={`/account/orders/${order.id}`}
                    >
                      <T en="View" fil="Tingnan" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !error ? (
        <div className="empty-state">
          <h2>
            <T en="No orders yet" fil="Wala pang order" />
          </h2>
          <p>
            <T
              en="Your order history will appear here."
              fil="Lalabas dito ang iyong order history."
            />
          </p>
        </div>
      ) : null}
    </section>
  );
}
