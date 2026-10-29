import { NextResponse } from "next/server";
import { verifyPayMongoSignature } from "@/lib/paymongo-signature";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_000_000) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1_000_000) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const envelope = record(body);
  const event = record(envelope?.data);
  const eventAttributes = record(event?.attributes);
  const livemode = eventAttributes?.livemode;
  const signature = request.headers.get("paymongo-signature") ?? request.headers.get("x-paymongo-signature");
  if (typeof livemode !== "boolean" || !verifyPayMongoSignature(rawBody, signature, livemode)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  if (typeof event?.id !== "string" || !/^evt_[A-Za-z0-9]+$/.test(event.id) || typeof eventAttributes?.type !== "string") {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const eventType = eventAttributes.type;
  const session = record(eventAttributes.data);
  const sessionAttributes = record(session?.attributes);
  const paymentIntent = record(sessionAttributes?.payment_intent);
  const paymentIntentAttributes = record(paymentIntent?.attributes);
  const paymentEntries = Array.isArray(sessionAttributes?.payments) ? sessionAttributes.payments : [];
  const paidEntries = paymentEntries.flatMap((entry) => {
    const payment = record(entry);
    const attributes = record(payment?.attributes);
    return attributes?.status === "paid" ? [{ payment, attributes }] : [];
  });
  const paid = paidEntries.length === 1 ? paidEntries[0] : null;
  const sessionAmount = typeof paymentIntentAttributes?.amount === "number" ? paymentIntentAttributes.amount : null;
  const paymentAmount = typeof paid?.attributes.amount === "number" ? paid.attributes.amount : null;
  const currency = typeof paid?.attributes.currency === "string"
    ? paid.attributes.currency
    : typeof paymentIntentAttributes?.currency === "string" ? paymentIntentAttributes.currency : null;

  const supabase = createServiceRoleClient();
  if (!supabase) return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  const { data: result, error } = await supabase.rpc("process_paymongo_webhook", {
    p_event_id: event.id,
    p_event_type: eventType,
    p_session_id: typeof session?.id === "string" ? session.id : null,
    p_order_reference: typeof sessionAttributes?.reference_number === "string" ? sessionAttributes.reference_number : null,
    p_session_amount: sessionAmount,
    p_payment_amount: paymentAmount,
    p_currency: currency,
    p_payment_id: typeof paid?.payment?.id === "string" ? paid.payment.id : null,
  });
  if (error) {
    console.error("PayMongo webhook database processing failed", error.code ?? "unknown");
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true, result }, { status: 200 });
}
