import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppBaseUrl } from "@/lib/config";
import { getSnapshotOptions } from "@/lib/order-snapshot";
import { createPayMongoCheckoutSession, retrievePayMongoCheckoutSession } from "@/lib/paymongo";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

export async function getOrCreatePayMongoCheckout(
  supabase: SupabaseClient<Database>,
  customerId: string,
  orderId: string,
): Promise<string> {
  const { data: order } = await supabase
    .from("orders")
    .select("id,order_reference,customer_id,order_status,payment_method,payment_status,total_cents,delivery_fee_cents")
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!order || order.payment_method !== "paymongo" || order.payment_status !== "pending" || order.order_status === "cancelled") {
    throw new Error("order_not_payable");
  }

  const { data: existing } = await supabase
    .from("payments")
    .select("provider_session_id,provider_reference,status")
    .eq("order_id", order.id)
    .eq("provider", "paymongo")
    .maybeSingle();
  if (!existing || existing.status !== "pending") throw new Error("payment_not_payable");
  if (existing.provider_session_id && existing.provider_reference?.startsWith("https://checkout.paymongo.com/")) {
    const providerSession = await retrievePayMongoCheckoutSession(existing.provider_session_id);
    if (providerSession.referenceNumber !== order.order_reference) throw new Error("paymongo_order_reference_mismatch");
    if (providerSession.status === "expired") {
      const service = createServiceRoleClient();
      if (!service) throw new Error("paymongo_reconciliation_not_configured");
      const { error } = await service.rpc("mark_paymongo_session_expired", {
        p_order_id: order.id,
        p_session_id: existing.provider_session_id,
      });
      if (error) throw new Error("paymongo_expiry_record_failed");
      throw new Error("paymongo_session_expired");
    }
    if (providerSession.paid) throw new Error("paymongo_payment_awaiting_webhook");
    return existing.provider_reference;
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("item_name_snapshot,selection_snapshot,unit_price_cents,quantity")
    .eq("order_id", order.id)
    .order("created_at");
  if (itemsError || !items?.length) throw new Error("order_items_unavailable");

  const lineItems = items.map((item) => {
    const options = getSnapshotOptions(item.selection_snapshot);
    return {
      name: [item.item_name_snapshot, ...options].join(" ").slice(0, 120),
      amount: item.unit_price_cents,
      quantity: item.quantity,
    };
  });
  if (order.delivery_fee_cents > 0) {
    lineItems.push({ name: "Delivery", amount: order.delivery_fee_cents, quantity: 1 });
  }

  const baseUrl = getAppBaseUrl();
  if (process.env.NODE_ENV === "production" && !baseUrl.startsWith("https://")) throw new Error("secure_app_base_url_required");
  const confirmationUrl = `${baseUrl}/order/confirmation/${encodeURIComponent(order.order_reference)}`;
  const session = await createPayMongoCheckoutSession({
    orderId: order.id,
    orderReference: order.order_reference,
    successUrl: `${confirmationUrl}?payment=return`,
    cancelUrl: `${confirmationUrl}?payment=cancelled`,
    lineItems,
  });
  const { data: attached, error: attachError } = await supabase.rpc("attach_paymongo_checkout_session", {
    p_order_id: order.id,
    p_session_id: session.sessionId,
    p_checkout_url: session.checkoutUrl,
  });
  if (attachError || !attached?.[0]?.provider_session_id || !attached[0].provider_reference) throw new Error("checkout_session_attach_failed");
  return attached[0].provider_reference;
}
