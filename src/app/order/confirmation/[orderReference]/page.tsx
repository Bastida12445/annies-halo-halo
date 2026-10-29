import Link from "next/link";
import type { Metadata } from "next";
import { ClearCartOnce } from "@/components/clear-cart-once";
import { PaymentQrInstructions } from "@/components/payment-qr-instructions";
import { T } from "@/components/language-provider";
import { requireCustomer } from "@/lib/auth";
import { formatDateTime, formatPhp } from "@/lib/money";
import { getSupabaseConfig } from "@/lib/config";
import { notFound } from "next/navigation";
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
  const { supabase, user } = await requireCustomer("/account/orders");
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("order_reference", orderReference)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!order) notFound();
  const qrPayment = isQrPaymentMethod(order.payment_method) && order.payment_status === "pending"
    ? await supabase
        .from("payments")
        .select("provider_reference,qr_image_path")
        .eq("order_id", order.id)
        .eq("provider", "manual")
        .maybeSingle()
    : null;
  return (
    <section className="section container">
      <ClearCartOnce />
      <div className="form-shell">
        <span className="eyebrow">
          <T en="Order received" fil="Natanggap ang order" />
        </span>
        <h1>
          <T
            en="Thanks for your order request"
            fil="Salamat sa iyong order request"
          />
        </h1>
        <p className="lead">
          <T en="Your reference is" fil="Ang reference mo ay" />{" "}
          <strong>{order.order_reference}</strong>.
        </p>
        <p>
          {order.payment_method === "paymongo" && order.payment_status === "pending" ? (
            <T en="PayMongo has not confirmed payment yet. This page never treats the browser return as proof of payment; check your order details for the secure checkout link and payment status." fil="Hindi pa kinukumpirma ng PayMongo ang bayad. Hindi itinuturing ng pahinang ito na patunay ng bayad ang pagbabalik ng browser; tingnan ang detalye ng order para sa secure na checkout link at status ng bayad." />
          ) : (
            <T en="The request is pending until the shop reviews it. Check your account for status updates." fil="Pending ang request hanggang masuri ito ng tindahan. Tingnan ang account para sa update." />
          )}
        </p>
        {isQrPaymentMethod(order.payment_method) && order.payment_status === "pending" && order.order_status !== "cancelled" && (
          <PaymentQrInstructions
            orderId={order.id}
            method={order.payment_method}
            imagePath={qrPayment?.data?.qr_image_path ?? null}
            amountCents={order.total_cents}
            reference={qrPayment?.data?.provider_reference ?? null}
          />
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
