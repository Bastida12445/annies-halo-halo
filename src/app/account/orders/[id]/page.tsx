import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cancelOrderAction, startPayMongoPaymentAction } from "@/app/actions/shop";
import { PrintButton } from "@/components/print-button";
import { T } from "@/components/language-provider";
import { requireCustomer } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/business";
import { getSupabaseConfig } from "@/lib/config";
import { formatDateTime, formatPhp } from "@/lib/money";
import { getSnapshotOptions } from "@/lib/order-snapshot";
import { PaymentQrInstructions } from "@/components/payment-qr-instructions";
import { isQrPaymentMethod } from "@/lib/payment-qr";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

export default async function OrderDetailsPage({
  params,
  searchParams,
}: PageProps<"/account/orders/[id]">) {
  if (!getSupabaseConfig())
    return (
      <section className="customer-account-page">
        <div className="form-shell">
          <h1>
            <T
              en="Order details are unavailable"
              fil="Hindi available ang detalye ng order"
            />
          </h1>
        </div>
      </section>
    );
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const { supabase, user } = await requireCustomer(`/account/orders/${id}`);
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!order) notFound();
  const [{ data: items }, { data: history }, { data: payment }, settings] = await Promise.all([
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at"),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("provider,status,provider_session_id,provider_reference,qr_image_path")
      .eq("order_id", order.id)
      .maybeSingle(),
    getBusinessSettings(),
  ]);
  const nextStep = {
    pending_confirmation: [
      "The shop will review your request and update its status.",
      "Susuriin ng tindahan ang request at ia-update ang status.",
    ],
    confirmed: [
      "Your order is confirmed. Follow any pickup or delivery instructions from the shop.",
      "Kumpirmado ang order. Sundin ang pickup o delivery na tagubilin ng tindahan.",
    ],
    preparing: [
      "The shop is preparing your order.",
      "Inihahanda ng tindahan ang order.",
    ],
    ready_for_pickup: [
      "Your order is ready for pickup.",
      "Handa na para kunin ang order.",
    ],
    out_for_delivery: [
      "Your order is on its way.",
      "Nasa biyahe na ang order.",
    ],
    completed: ["This order is complete.", "Tapos na ang order na ito."],
    cancelled: [
      "This order was cancelled. Contact the shop if you have a payment question.",
      "Nakansela ang order. Makipag-ugnayan sa tindahan kung may tanong tungkol sa bayad.",
    ],
  }[order.order_status];
  return (
    <section className="customer-account-page">
      <span className="eyebrow">
        <T en="Order details" fil="Detalye ng order" />
      </span>
      <h1>{order.order_reference}</h1>
      <div className="button-row no-print">
        <PrintButton />
      </div>
      {query.payment === "retry" && <p className="form-notice no-print"><T en="PayMongo checkout could not be started. Use the secure payment button below to retry." fil="Hindi nasimulan ang PayMongo checkout. Gamitin ang secure na button sa ibaba para subukan muli." /></p>}
      {query.payment === "processing" && <p className="form-notice no-print"><T en="The payment session may be processing, so the order was not cancelled. Check the payment status or contact the shop before retrying." fil="Maaaring pinoproseso pa ang bayad kaya hindi nakansela ang order. Suriin ang status ng bayad o makipag-ugnayan sa tindahan bago subukang muli." /></p>}
      {query.payment === "expired" && <p className="form-notice no-print"><T en="PayMongo confirms that this checkout session expired. This order cannot be paid with the old link; contact the shop if you still need it." fil="Kinukumpirma ng PayMongo na expired na ang checkout session. Hindi na mababayaran ang order gamit ang lumang link; makipag-ugnayan sa tindahan kung kailangan pa ito." /></p>}
      {query.payment === "paid" && <p className="form-notice no-print"><T en={isQrPaymentMethod(order.payment_method) ? "Staff already verified this QR payment. The order was not cancelled; contact the shop for help." : "PayMongo reports a completed payment. The order was not cancelled; contact the shop for help."} fil={isQrPaymentMethod(order.payment_method) ? "Na-verify na ng staff ang QR payment. Hindi nakansela ang order; makipag-ugnayan sa tindahan para sa tulong." : "Nag-uulat ang PayMongo ng nakumpletong bayad. Hindi nakansela ang order; makipag-ugnayan sa tindahan para sa tulong."} /></p>}
      <div className="printable">
        <header className="receipt-header">
          <h2>{settings.business_name}</h2>
          <p>{settings.address}</p>
          {settings.phone && <p>{settings.phone}</p>}
          <h3>Order {order.order_reference}</h3>
          <p>{formatDateTime(order.created_at)}</p>
        </header>
        {isQrPaymentMethod(order.payment_method) && order.payment_status === "pending" && order.order_status !== "cancelled" && (
          <PaymentQrInstructions
            orderId={order.id}
            method={order.payment_method}
            imagePath={payment?.qr_image_path ?? null}
            amountCents={order.total_cents}
            reference={payment?.provider_reference ?? null}
          />
        )}
        <div className="split-section">
          <div className="content-card">
            <h2>
              <T en="Items" fil="Mga produkto" />
            </h2>
            <div className="cart-list">
              {(items ?? []).map((item) => (
                <div className="cart-row" key={item.id}>
                  <div>
                    <strong>{item.item_name_snapshot}</strong>
                    {getSnapshotOptions(item.selection_snapshot).map(
                      (option) => (
                        <small key={option}>{option}</small>
                      ),
                    )}
                    <small>
                      {item.quantity} × {formatPhp(item.unit_price_cents)}
                    </small>
                  </div>
                  <strong>{formatPhp(item.line_total_cents)}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="content-card">
            <h2>
              <T en="Status & totals" fil="Status at kabuuan" />
            </h2>
            <p>
              <T en="Order status" fil="Status ng order" />:{" "}
              <span className="status-badge">
                {order.order_status.replaceAll("_", " ")}
              </span>
            </p>
            <p>
              <T en="Payment" fil="Bayad" />:{" "}
              <span className="status-badge status-badge-warning">
                {order.payment_status}
              </span>{" "}
              · {order.payment_method.replaceAll("_", " ")}
            </p>
            <p>
              <T en="Fulfillment" fil="Pagtanggap" />:{" "}
              {order.fulfillment_method}
            </p>
            {order.delivery_address && (
              <p>
                <strong>
                  <T en="Delivery address" fil="Delivery address" />:
                </strong>{" "}
                {order.delivery_address}
                {order.service_area ? ` · ${order.service_area}` : ""}
              </p>
            )}
            {order.customer_phone && (
              <p>
                <T en="Contact number" fil="Numero ng telepono" />:{" "}
                {order.customer_phone}
              </p>
            )}
            <p>
              <strong>
                <T en="Next step" fil="Susunod na hakbang" />:
              </strong>{" "}
              <T en={nextStep[0]} fil={nextStep[1]} />
            </p>
            {order.payment_method === "paymongo" && order.payment_status === "pending" && payment?.provider === "paymongo" && (
              <form action={startPayMongoPaymentAction} className="no-print">
                <input type="hidden" name="order_id" value={order.id} />
                <button className="button" type="submit"><T en="Continue secure payment" fil="Ituloy ang secure na bayad" /></button>
                <p className="field-help"><T en="Payment is confirmed only after the verified PayMongo webhook arrives. Returning from checkout does not mark an order paid." fil="Makukumpirma lamang ang bayad kapag natanggap ang beripikadong PayMongo webhook. Hindi nangangahulugang bayad na ang order kapag bumalik mula sa checkout." /></p>
              </form>
            )}
            <div className="cart-summary">
              <div className="summary-line">
                <span>
                  <T en="Subtotal" fil="Subtotal" />
                </span>
                <strong>{formatPhp(order.subtotal_cents)}</strong>
              </div>
              <div className="summary-line">
                <span>
                  <T en="Delivery fee" fil="Delivery fee" />
                </span>
                <strong>{formatPhp(order.delivery_fee_cents)}</strong>
              </div>
              <div className="summary-line summary-total">
                <span>
                  <T en="Total" fil="Kabuuan" />
                </span>
                <strong>{formatPhp(order.total_cents)}</strong>
              </div>
            </div>
            {order.order_status === "pending_confirmation" && (
              <form action={cancelOrderAction} className="no-print">
                <input type="hidden" name="order_id" value={order.id} />
                <button className="button button-secondary" type="submit">
                  <T en="Request cancellation" fil="Humiling ng pagkansela" />
                </button>
              </form>
            )}
          </div>
        </div>
        <div className="content-card">
          <h2>
            <T en="Status history" fil="Kasaysayan ng status" />
          </h2>
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
            <p>
              <T
                en="No status history is available."
                fil="Walang kasaysayan ng status."
              />
            </p>
          )}
        </div>
      </div>
      <p className="no-print">
        <Link className="text-link" href="/account/orders">
          <T en="Back to order history" fil="Bumalik sa order history" />
        </Link>
      </p>
    </section>
  );
}
