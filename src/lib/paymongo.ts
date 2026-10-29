import "server-only";
import { getPayMongoConfig } from "@/lib/paymongo-config";

export type PayMongoLineItem = {
  name: string;
  amount: number;
  quantity: number;
};

export type PayMongoSessionState = {
  sessionId: string;
  referenceNumber: string;
  status: "active" | "expired";
  paid: boolean;
};

async function payMongoRequest(path: string, method: "GET" | "POST") {
  const config = getPayMongoConfig();
  if (!config) throw new Error("paymongo_not_configured");
  const response = await fetch(`https://api.paymongo.com/v2/checkout_sessions/${path}`, {
    method,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
  });
  const payload: unknown = await response.json().catch(() => null);
  return { response, payload };
}

function parsePayMongoSession(payload: unknown): PayMongoSessionState | null {
  if (!payload || typeof payload !== "object" || !("data" in payload)) return null;
  const data = payload.data;
  if (!data || typeof data !== "object" || !("id" in data) || !("attributes" in data)) return null;
  const attributes = data.attributes;
  if (typeof data.id !== "string" || !/^cs_[A-Za-z0-9]+$/.test(data.id) || !attributes || typeof attributes !== "object") return null;
  if (!("status" in attributes) || !("reference_number" in attributes) || typeof attributes.reference_number !== "string") return null;
  if (attributes.status !== "active" && attributes.status !== "expired") return null;
  const payments = "payments" in attributes && Array.isArray(attributes.payments) ? attributes.payments : [];
  const paid = payments.some((entry) => {
    if (!entry || typeof entry !== "object" || !("attributes" in entry) || !entry.attributes || typeof entry.attributes !== "object") return false;
    return "status" in entry.attributes && entry.attributes.status === "paid";
  });
  return { sessionId: data.id, referenceNumber: attributes.reference_number, status: attributes.status, paid };
}

export async function retrievePayMongoCheckoutSession(sessionId: string): Promise<PayMongoSessionState> {
  if (!/^cs_[A-Za-z0-9]+$/.test(sessionId)) throw new Error("invalid_checkout_session");
  const { response, payload } = await payMongoRequest(encodeURIComponent(sessionId), "GET");
  if (!response.ok) throw new Error(`paymongo_http_${response.status}`);
  const session = parsePayMongoSession(payload);
  if (!session) throw new Error("paymongo_invalid_response");
  return session;
}

export async function expirePayMongoCheckoutSession(sessionId: string, expectedReference: string): Promise<"expired" | "paid"> {
  const before = await retrievePayMongoCheckoutSession(sessionId);
  if (before.referenceNumber !== expectedReference) throw new Error("paymongo_order_reference_mismatch");
  if (before.paid) return "paid";
  if (before.status === "expired") return "expired";

  const { response } = await payMongoRequest(`${encodeURIComponent(sessionId)}/expire`, "POST");
  if (!response.ok) {
    const afterFailure = await retrievePayMongoCheckoutSession(sessionId);
    if (afterFailure.referenceNumber !== expectedReference) throw new Error("paymongo_order_reference_mismatch");
    if (afterFailure.paid) return "paid";
    if (afterFailure.status === "expired") return "expired";
    throw new Error("paymongo_session_cannot_be_expired");
  }
  const after = await retrievePayMongoCheckoutSession(sessionId);
  if (after.referenceNumber !== expectedReference) throw new Error("paymongo_order_reference_mismatch");
  if (after.paid) return "paid";
  if (after.status !== "expired") throw new Error("paymongo_session_expiry_unconfirmed");
  return "expired";
}

export async function createPayMongoCheckoutSession(input: {
  orderId: string;
  orderReference: string;
  successUrl: string;
  cancelUrl: string;
  lineItems: PayMongoLineItem[];
}): Promise<{ sessionId: string; checkoutUrl: string }> {
  const config = getPayMongoConfig();
  if (!config) throw new Error("paymongo_not_configured");

  const response = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.orderId,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: input.lineItems.map((item) => ({
            name: item.name.slice(0, 120),
            amount: item.amount,
            currency: "PHP",
            quantity: item.quantity,
          })),
          payment_method_types: config.channels,
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          reference_number: input.orderReference,
          send_email_receipt: true,
          pass_on_fees: false,
          metadata: { order_id: input.orderId },
        },
      },
    }),
  });

  if (!response.ok) throw new Error(`paymongo_http_${response.status}`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || !("data" in payload)) throw new Error("paymongo_invalid_response");
  const data = payload.data;
  if (!data || typeof data !== "object" || !("id" in data) || !("attributes" in data)) throw new Error("paymongo_invalid_response");
  const attributes = data.attributes;
  if (typeof data.id !== "string" || !/^cs_[A-Za-z0-9]+$/.test(data.id) || !attributes || typeof attributes !== "object" || !("checkout_url" in attributes) || typeof attributes.checkout_url !== "string") {
    throw new Error("paymongo_invalid_response");
  }
  const checkoutUrl = new URL(attributes.checkout_url);
  if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.paymongo.com") throw new Error("paymongo_invalid_checkout_url");
  return { sessionId: data.id, checkoutUrl: checkoutUrl.toString() };
}
