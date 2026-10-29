import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { AdminActionForm } from "@/components/admin-action-form";
import { changeOrderStatusAction, recordManualPaymentCollectedAction } from "@/app/actions/shop";
import { requireStaff } from "@/lib/auth";
import { formatDateTime, formatPhp } from "@/lib/money";
import type { OrderStatus } from "@/types/database";
import { getPaymentQrLabel, isQrPaymentMethod } from "@/lib/payment-qr";

export const metadata: Metadata = { title: "Manage order" };
const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "out_for_delivery", "completed", "cancelled"],
  ready_for_pickup: ["completed", "cancelled"],
  out_for_delivery: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export default async function AdminOrderDetail({
  params,
}: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const { supabase, roles } = await requireStaff(["administrator", "order_manager"]);
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();
  const [{ data: items }, { data: history }, { data: customer }, { data: payment }] =
    await Promise.all([
      supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id)
        .order("created_at"),
      supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("full_name,phone")
        .eq("id", order.customer_id)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("provider,provider_session_id,provider_reference,status,qr_image_path")
        .eq("order_id", order.id)
        .maybeSingle(),
    ]);
  const statuses = nextStatuses[order.order_status]
    .filter(
      (status) =>
        status !== "ready_for_pickup" || order.fulfillment_method === "pickup",
    )
    .filter(
      (status) =>
        status !== "out_for_delivery" ||
        order.fulfillment_method === "delivery",
    )
    .filter((status) => order.payment_method !== "paymongo" || order.payment_status === "paid" || status === "cancelled")
    .filter((status) => !isQrPaymentMethod(order.payment_method) || order.payment_status === "paid" || status === "cancelled");
  return (
    <AdminShell title={`Order ${order.order_reference}`} roles={roles}>
      <div className="content-card">
        <div className="split-section">
          <div>
            <h2>Customer</h2>
            <p>{customer?.full_name || "Name not available"}</p>
            <p>
              {order.customer_phone || customer?.phone || "No phone provided"}
            </p>
            <p>{order.customer_id}</p>
            {order.delivery_address && (
              <p>
                <strong>Delivery address:</strong> {order.delivery_address}
                {order.service_area ? ` · ${order.service_area}` : ""}
              </p>
            )}
            {order.customer_notes && (
              <p>
                <strong>Customer notes:</strong> {order.customer_notes}
              </p>
            )}
          </div>
          <div>
            <h2>Order & payment</h2>
            <p>
              {formatDateTime(order.created_at)} · {order.fulfillment_method}
            </p>
            <p>
              Status:{" "}
              <span className="status-badge">
                {order.order_status.replaceAll("_", " ")}
              </span>
            </p>
            <p>
              Payment: {order.payment_method} / {order.payment_status}
            </p>
            {payment?.provider === "paymongo" && (
              <>
                <p>PayMongo Checkout Session: {payment.provider_session_id ?? "Not created"}</p>
                {order.payment_status !== "paid" && <p className="form-notice">Do not mark this order paid from the browser or by editing the database. Reconcile the exact order reference and session in PayMongo, then resend its signed webhook if delivery was delayed.</p>}
              </>
            )}
            {isQrPaymentMethod(order.payment_method) && (
              <p>
                {getPaymentQrLabel(order.payment_method)} transfer reference: {payment?.provider_reference || "Not submitted yet"}
              </p>
            )}
            <p>
              Subtotal {formatPhp(order.subtotal_cents)} · Fee{" "}
              {formatPhp(order.delivery_fee_cents)}
            </p>
            <strong>Total {formatPhp(order.total_cents)}</strong>
          </div>
        </div>
      </div>
      <div className="content-card">
        <h2>Items</h2>
        <div className="cart-list">
          {(items ?? []).map((item) => (
            <div className="cart-row" key={item.id}>
              <div>
                <strong>{item.item_name_snapshot}</strong>
                <small>
                  {item.quantity} × {formatPhp(item.unit_price_cents)}
                </small>
              </div>
              <strong>{formatPhp(item.line_total_cents)}</strong>
            </div>
          ))}
        </div>
      </div>
      {payment?.provider === "manual" && order.payment_status === "pending" && order.payment_method.startsWith("cash_on_") && (
          <div className="content-card">
            <h2>Record cash payment</h2>
            <p>Use this only after staff physically receive the full cash amount.</p>
            <AdminActionForm action={recordManualPaymentCollectedAction} submitLabel="Record cash received" className="form-stack">
              <input type="hidden" name="order_id" value={order.id} />
              <label className="check-row"><input type="checkbox" name="cash_received" required /> I confirm the full cash amount was received.</label>
              <label className="field-label">Note (optional)<textarea name="note" maxLength={300} /></label>
            </AdminActionForm>
          </div>
      )}
      {payment?.provider === "manual" && order.payment_status === "pending" && order.order_status !== "cancelled" && isQrPaymentMethod(order.payment_method) && (
        <div className="content-card">
          <h2>Verify {getPaymentQrLabel(order.payment_method)} transfer</h2>
          <p>Compare the customer’s submitted reference and the exact order total with the money received in the shop’s wallet. This action records staff verification; it does not contact GCash or Maya.</p>
          <p><strong>Submitted reference:</strong> {payment.provider_reference || "Not submitted yet"}</p>
          {payment.provider_reference ? (
            <AdminActionForm action={recordManualPaymentCollectedAction} submitLabel="Verify QR payment received" className="form-stack">
              <input type="hidden" name="order_id" value={order.id} />
              <label className="check-row"><input type="checkbox" name="payment_verified" required /> I verified the full {formatPhp(order.total_cents)} transfer in the receiving wallet.</label>
              <label className="field-label">Verification note (optional)<textarea name="note" maxLength={300} /></label>
            </AdminActionForm>
          ) : (
            <p className="form-notice">Waiting for the customer to submit the wallet transaction reference.</p>
          )}
        </div>
      )}
      <div className="content-card">
        <h2>Update status</h2>
        {order.payment_method === "paymongo" && order.payment_status !== "paid" && <p className="form-notice">Fulfillment status changes are blocked until the verified PayMongo payment event arrives.</p>}
        {isQrPaymentMethod(order.payment_method) && order.payment_status !== "paid" && <p className="form-notice">Fulfillment status changes are blocked until staff verify the QR transfer.</p>}
        {order.payment_method === "paymongo" && order.payment_status === "paid" && <p className="form-notice">Cancelling a paid order does not issue a refund. Process and reconcile any refund in PayMongo separately.</p>}
        {isQrPaymentMethod(order.payment_method) && order.payment_status === "paid" && <p className="form-notice">Cancelling this prepaid order does not automatically refund the wallet transfer. Handle and record any refund separately.</p>}
        {statuses.length ? (
          <AdminActionForm
            action={changeOrderStatusAction}
            submitLabel="Save status"
            className="form-stack"
          >
            <input type="hidden" name="order_id" value={order.id} />
            <label className="field-label">
              Next status
              <select name="new_status" required>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Staff note
              <textarea name="note" maxLength={500} rows={3} />
            </label>
          </AdminActionForm>
        ) : (
          <p>This order is in a final status.</p>
        )}
      </div>
      <div className="content-card">
        <h2>Status history</h2>
        {history?.length ? (
          <ol className="history-list">
            {history.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.new_status.replaceAll("_", " ")}</strong> ·{" "}
                {formatDateTime(entry.created_at)}
                {entry.note && <p>{entry.note}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p>No history is available.</p>
        )}
      </div>
    </AdminShell>
  );
}
