import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ClearCartOnce } from "@/components/clear-cart-once";
import { PaymentQrInstructions } from "@/components/payment-qr-instructions";
import { T } from "@/components/language-provider";
import { requireCustomer } from "@/lib/auth";
import { formatPhp } from "@/lib/money";
import { getSupabaseConfig } from "@/lib/config";
import { isQrPaymentMethod } from "@/lib/payment-qr";

export const metadata: Metadata = {
  title: "Complete QR payment",
  robots: { index: false, follow: false },
};

export default async function OrderPaymentPage({
  params,
}: PageProps<"/order/payment/[orderReference]">) {
  if (!getSupabaseConfig()) notFound();
  const { orderReference } = await params;
  const { supabase, user } = await requireCustomer(
    `/order/payment/${encodeURIComponent(orderReference)}`,
  );
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id,order_reference,order_status,payment_method,payment_status,total_cents",
    )
    .eq("order_reference", orderReference)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!order) notFound();

  if (
    !isQrPaymentMethod(order.payment_method) ||
    order.order_status === "cancelled" ||
    !["pending", "unpaid"].includes(order.payment_status)
  ) {
    redirect(`/order/confirmation/${encodeURIComponent(order.order_reference)}`);
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("provider_reference,qr_image_path")
    .eq("order_id", order.id)
    .eq("provider", "manual")
    .maybeSingle();

  if (payment?.provider_reference?.trim()) {
    redirect(`/order/confirmation/${encodeURIComponent(order.order_reference)}`);
  }

  return (
    <section className="section container">
      <ClearCartOnce />
      <div className="form-shell">
        <span className="eyebrow">
          <T en="Payment required" fil="Kailangan ng bayad" />
        </span>
        <h1>
          <T
            en="Pay with QR before viewing your receipt"
            fil="Magbayad gamit ang QR bago makita ang resibo"
          />
        </h1>
        <p className="lead">
          <T en="Order reference:" fil="Order reference:" />{" "}
          <strong>{order.order_reference}</strong>
        </p>
        <p>
          <T
            en={`Pay the exact total of ${formatPhp(order.total_cents)} using the QR below, then submit the transaction reference from your wallet.`}
            fil={`Bayaran ang eksaktong total na ${formatPhp(order.total_cents)} gamit ang QR sa ibaba, pagkatapos isumite ang transaction reference mula sa wallet mo.`}
          />
        </p>
        <p className="field-help">
          <T
            en="After you submit the reference, your order receipt will appear. Payment will still show as pending until Annie’s staff verifies the transfer."
            fil="Pagkatapos isumite ang reference, lalabas ang resibo ng order. Pending pa rin ang bayad hanggang ma-verify ng staff ng Annie’s ang transfer."
          />
        </p>
        <PaymentQrInstructions
          orderId={order.id}
          method={order.payment_method}
          imagePath={payment?.qr_image_path ?? null}
          amountCents={order.total_cents}
          reference={null}
        />
      </div>
    </section>
  );
}
