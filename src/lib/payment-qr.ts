export type QrPaymentMethod = "gcash_qr" | "paymaya_qr";

export function isQrPaymentMethod(value: string): value is QrPaymentMethod {
  return value === "gcash_qr" || value === "paymaya_qr";
}

export function getPaymentQrLabel(method: QrPaymentMethod) {
  return method === "gcash_qr" ? "GCash" : "Maya / PayMaya";
}

export function isPaymentQrImagePath(value: unknown): value is string {
  return typeof value === "string" &&
    /^qrs\/(?:gcash|paymaya)-[a-f0-9-]{36}\.(?:png|jpe?g|webp)$/i.test(value);
}

export function getPaymentQrImageUrl(path: string | null | undefined) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base || !isPaymentQrImagePath(path)) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/payment-qrs/${encodedPath}`;
}
