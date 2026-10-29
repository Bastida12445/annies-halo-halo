import { createHmac, timingSafeEqual } from "node:crypto";
import { getPayMongoConfig } from "@/lib/paymongo-config";

export function verifyPayMongoSignature(
  rawBody: string,
  signatureHeader: string | null,
  livemode: boolean,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const config = getPayMongoConfig();
  if (!config || (config.mode === "live") !== livemode || !signatureHeader) return false;

  const fields = new Map(
    signatureHeader.split(",").map((part) => {
      const separator = part.indexOf("=");
      return separator < 0
        ? [part.trim(), ""]
        : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
    }),
  );
  const timestamp = fields.get("t");
  const received = fields.get(livemode ? "li" : "te")?.toLowerCase();
  if (!timestamp || !/^\d{10}$/.test(timestamp) || !received || !/^[a-f0-9]{64}$/.test(received)) return false;

  // Event IDs are also deduplicated in Postgres; the timestamp bounds stale signed replays.
  if (Math.abs(nowSeconds - Number(timestamp)) > 7 * 24 * 60 * 60) return false;
  const expected = createHmac("sha256", config.webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest();
  const supplied = Buffer.from(received, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
