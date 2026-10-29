import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkoutSchema, registerSchema } from "@/lib/schemas";
import { formatDateTime, formatPhp } from "@/lib/money";
import { safeInternalRedirect } from "@/lib/redirects";
import { verifyPayMongoSignature } from "@/lib/paymongo-signature";

const paymongoEnv = ["PAYMONGO_SECRET_KEY", "PAYMONGO_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "PAYMONGO_PAYMENT_METHOD_TYPES"] as const;
const priorPaymongoEnv = new Map(paymongoEnv.map((key) => [key, process.env[key]]));

beforeEach(() => {
  process.env.PAYMONGO_SECRET_KEY = "sk_test_unit_test_key";
  process.env.PAYMONGO_WEBHOOK_SECRET = "unit-test-webhook-secret";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "unit-test-service-role-key-with-more-than-32-chars";
  process.env.PAYMONGO_PAYMENT_METHOD_TYPES = "qrph";
});

afterEach(() => {
  for (const key of paymongoEnv) {
    const previous = priorPaymongoEnv.get(key);
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
});

describe("safe internal redirects", () => {
  it("accepts a local path and query string", () => {
    expect(safeInternalRedirect("/account/orders?filter=open")).toBe(
      "/account/orders?filter=open",
    );
  });

  it.each([
    "https://example.com",
    "//evil.example",
    "/\\evil.example",
    "/account\r\nLocation: evil",
  ])("rejects unsafe target %s", (value) => {
    expect(safeInternalRedirect(value)).toBe("/account");
  });
  it("rejects repeated query parameters", () => {
    expect(safeInternalRedirect(["/account", "//evil.example"])).toBe(
      "/account",
    );
  });
});

describe("currency and local time formatting", () => {
  it("formats stored centavos as PHP", () => {
    expect(formatPhp(12550)).toContain("125.50");
  });

  it("uses the Philippines time zone for business dates", () => {
    expect(formatDateTime("2026-01-01T00:00:00.000Z")).toContain("2026");
  });
});

describe("form validation", () => {
  it("requires consent and matching strong passwords for registration", () => {
    const valid = registerSchema.safeParse({
      full_name: "Annie Customer",
      phone: "",
      email: "buyer@example.com",
      password: "a-long-password",
      password_confirmation: "a-long-password",
      terms: "on",
      privacy: "on",
    });
    const invalid = registerSchema.safeParse({
      full_name: "Annie Customer",
      phone: "",
      email: "buyer@example.com",
      password: "short",
      password_confirmation: "short",
      terms: "",
      privacy: "",
    });
    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it("rejects malformed or oversized checkout line items", () => {
    const result = checkoutSchema.safeParse({
      items: [{ productId: "not-a-uuid", quantity: 999 }],
      fulfillmentMethod: "pickup",
      phone: "",
      paymentMethod: "cash_on_pickup",
      idempotencyKey: "not-a-uuid",
      expectedTotalCents: 200,
    });
    expect(result.success).toBe(false);
  });
});

describe("PayMongo webhook signatures", () => {
  const timestamp = 1_800_000_000;
  const rawBody = '{"data":{"id":"evt_unit"}}';

  function signatureFor(body: string, time = timestamp) {
    const digest = createHmac("sha256", "unit-test-webhook-secret")
      .update(`${time}.${body}`)
      .digest("hex");
    return `t=${time},te=${digest},li=`;
  }

  it("accepts a valid test-mode signature over the exact raw body", () => {
    expect(verifyPayMongoSignature(rawBody, signatureFor(rawBody), false, timestamp)).toBe(true);
  });

  it("rejects a modified body, the wrong environment, and an old signed replay", () => {
    const signature = signatureFor(rawBody);
    expect(verifyPayMongoSignature(`${rawBody} `, signature, false, timestamp)).toBe(false);
    expect(verifyPayMongoSignature(rawBody, signature, true, timestamp)).toBe(false);
    expect(verifyPayMongoSignature(rawBody, signatureFor(rawBody), false, timestamp + 8 * 24 * 60 * 60)).toBe(false);
  });
});
