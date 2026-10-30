import Link from "next/link";
import type { Metadata } from "next";
import { ClearCartOnce } from "@/components/clear-cart-once";
import { T } from "@/components/language-provider";
import { requireCustomer } from "@/lib/auth";
import { formatDateTime, formatPhp } from "@/lib/money";
import { getSupabaseConfig } from "@/lib/config";
import { notFound, redirect } from "next/navigation";
import { isQrPaymentMethod } from "@/lib/payment-qr";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({
  params,
}: PageProps<"/order/confirmation/[orderReference]">) {
  if (!getSupabaseConfig()) notFound();
  const { orderReference } = await params;
  const { supabase, user } = await requireCustomer(
    `/order/confirmation/${encodeURIComponent(orderReference)}`,
  );
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("order_reference", orderReference)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!order) notFound();
  const qrPayment = isQrPaymentMethod(order.payment_method)
    ? await supabase
        .from("payments")
        .select("provider_reference")
        .eq("order_id", order.id)
        .eq("provider", "manual")
        .maybeSingle()
    : null;
  const qrReferenceSubmitted = Boolean(
    qrPayment?.data?.provider_reference?.trim(),
  );
  const qrPaymentExpired =
    isQrPaymentMethod(order.payment_method) &&
    order.payment_status === "expired" &&
    !qrReferenceSubmitted;
  const qrPaymentFailed =
    isQrPaymentMethod(order.payment_method) &&
    order.payment_status === "failed" &&
    !qrReferenceSubmitted;
  if (
    isQrPaymentMethod(order.payment_method) &&
    order.order_status !== "cancelled" &&
    ["pending", "unpaid"].includes(order.payment_status) &&
    !qrReferenceSubmitted
  ) {
    redirect(`/order/payment/${encodeURIComponent(order.order_reference)}`);
  }
  return (
    <section className="section container">
      <ClearCartOnce />
      <div className="form-shell">
        <span className="eyebrow">
          {order.order_status === "cancelled" ? (
            <T en="Order update" fil="Update sa order" />
          ) : qrPaymentExpired || qrPaymentFailed ? (
            <T en="Payment status" fil="Status ng bayad" />
          ) : (
            <T en="Order received" fil="Natanggap ang order" />
          )}
        </span>
        <h1>
          {order.order_status === "cancelled" ? (
            <T
              en="This order was cancelled"
              fil="Nakansela ang order na ito"
            />
          ) : qrPaymentExpired ? (
            <T
              en="Your QR payment expired"
              fil="Nag-expire ang QR payment mo"
            />
          ) : qrPaymentFailed ? (
            <T
              en="Your QR payment was not completed"
              fil="Hindi nakumpleto ang QR payment mo"
            />
          ) : (
            <T
              en="Thanks for your order request"
              fil="Salamat sa iyong order request"
            />
          )}
        </h1>
        <p className="lead">
          <T en="Your reference is" fil="Ang reference mo ay" />{" "}
          <strong>{order.order_reference}</strong>.
        </p>
        <p>
          {order.order_status === "cancelled" ? (
            <T
              en={
                order.payment_status === "paid"
                  ? "The order was cancelled after payment was recorded. Contact the shop about any refund."
                  : "The order was cancelled. If you already sent a QR transfer, contact the shop."
              }
              fil={
                order.payment_status === "paid"
                  ? "Nakansela ang order matapos maitala ang bayad. Makipag-ugnayan sa tindahan tungkol sa refund."
                  : "Nakansela ang order. Kung nakapagpadala ka na ng QR payment, makipag-ugnayan sa tindahan."
              }
            />
          ) : qrPaymentExpired ? (
            <T
              en="This QR payment expired. Place a new order, or contact the shop if you already sent the transfer."
              fil="Nag-expire ang QR payment na ito. Gumawa ng bagong order, o makipag-ugnayan sa tindahan kung naipadala mo na ang bayad."
            />
          ) : qrPaymentFailed ? (
            <T
              en="The QR payment was not completed. Place a new order, or contact the shop if you already sent the transfer."
              fil="Hindi nakumpleto ang QR payment. Gumawa ng bagong order, o makipag-ugnayan sa tindahan kung naipadala mo na ang bayad."
            />
          ) :
          order.payment_method === "paymongo" &&
            order.payment_status === "pending" ? (
            <T en="PayMongo has not confirmed payment yet. This page never treats the browser return as proof of payment; check your order details for the secure checkout link and payment status." fil="Hindi pa kinukumpirma ng PayMongo ang bayad. Hindi itinuturing ng pahinang ito na patunay ng bayad ang pagbabalik ng browser; tingnan ang detalye ng order para sa secure na checkout link at status ng bayad." />
          ) : (
            <T en="The request is pending until the shop reviews it. Check your account for status updates." fil="Pending ang request hanggang masuri ito ng tindahan. Tingnan ang account para sa update." />
          )}
        </p>
        {isQrPaymentMethod(order.payment_method) &&
          ["pending", "unpaid"].includes(order.payment_status) &&
          qrReferenceSubmitted && (
            <p className="form-notice" role="status">
              <T
                en="Your transfer reference was submitted. Payment remains pending until the shop verifies it."
                fil="Naipasa na ang transfer reference mo. Pending pa rin ang bayad hanggang ma-verify ito ng tindahan."
              />
            </p>
        )}
        <div className="cart-summary">
          <div className="summary-line">
            <span>
              <T en="Status" fil="Status" />
            </span>
            <strong>
              <span className="status-badge">
                {order.order_status.replaceAll("_", " ")}
              </span>
            </strong>
          </div>
          <div className="summary-line">
            <span>
              <T en="Payment" fil="Bayad" />
            </span>
            <strong>
              <span className="status-badge status-badge-warning">
                {order.payment_status}
              </span>
            </strong>
          </div>
          <div className="summary-line">
            <span>
              <T en="Total" fil="Kabuuan" />
            </span>
            <strong>{formatPhp(order.total_cents)}</strong>
          </div>
          <div className="summary-line">
            <span>
              <T en="Placed" fil="Petsa" />
            </span>
            <strong>{formatDateTime(order.created_at)}</strong>
          </div>
        </div>
        <div className="button-row">
          <Link className="button" href={`/account/orders/${order.id}`}>
            <T en="Track this order" fil="Subaybayan ang order" />
          </Link>
          <Link className="button button-secondary" href="/menu">
            <T en="Back to menu" fil="Bumalik sa menu" />
          </Link>
        </div>
      </div>
    </section>
  );
}
