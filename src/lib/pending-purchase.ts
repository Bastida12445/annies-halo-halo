import type { CartLine } from "@/components/cart-provider";

export type PurchaseMode = "add" | "buy-now";
export type PendingPurchase = {
  productId: string;
  pathname: string;
  line: Omit<CartLine, "key" | "quantity">;
  quantity: number;
  mode: PurchaseMode;
  createdAt: number;
};

const storageKey = "annies-pending-purchase-v1";
const maxAgeMs = 15 * 60 * 1000;

function clearPendingPurchase() {
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Storage can be disabled by the browser.
  }
}

export function loginHref(returnPath: string) {
  return `/login?next=${encodeURIComponent(returnPath)}`;
}

export function beginPurchase({
  isAuthenticated,
  returnPath,
  line,
  quantity,
  mode,
}: Omit<PendingPurchase, "createdAt" | "pathname"> & {
  isAuthenticated: boolean;
  returnPath: string;
}) {
  if (isAuthenticated) return true;

  const pending: PendingPurchase = {
    productId: line.productId,
    pathname: returnPath,
    line,
    quantity,
    mode,
    createdAt: Date.now(),
  };
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(pending));
  } catch {
    // The customer can still sign in and retry if browser storage is unavailable.
  }
  window.location.assign(loginHref(returnPath));
  return false;
}

function isPendingPurchase(value: unknown): value is PendingPurchase {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const line = item.line as Record<string, unknown> | null;
  if (!line || typeof line !== "object") return false;
  return (
    typeof item.productId === "string" &&
    typeof item.pathname === "string" &&
    Number.isInteger(item.quantity) &&
    Number(item.quantity) >= 1 &&
    Number(item.quantity) <= 20 &&
    (item.mode === "add" || item.mode === "buy-now") &&
    Number.isFinite(item.createdAt) &&
    typeof line.productId === "string" &&
    typeof line.slug === "string" &&
    typeof line.name === "string" &&
    Number.isInteger(line.unitPriceCents) &&
    Number(line.unitPriceCents) >= 0 &&
    (line.variantId === null || typeof line.variantId === "string") &&
    (line.variantName === null || typeof line.variantName === "string") &&
    Array.isArray(line.addons) &&
    line.addons.every((addon: unknown) => {
      if (!addon || typeof addon !== "object") return false;
      const entry = addon as Record<string, unknown>;
      return (
        typeof entry.id === "string" &&
        typeof entry.name === "string" &&
        Number.isInteger(entry.priceCents) &&
        Number(entry.priceCents) >= 0
      );
    })
  );
}

export function consumePendingPurchase(
  productId: string,
  pathname: string,
): PendingPurchase | null {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
  if (!raw) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    clearPendingPurchase();
    return null;
  }
  if (!isPendingPurchase(value)) {
    clearPendingPurchase();
    return null;
  }
  if (Date.now() - value.createdAt > maxAgeMs) {
    clearPendingPurchase();
    return null;
  }
  if (
    value.productId !== productId ||
    value.line.productId !== productId ||
    value.pathname !== pathname
  ) {
    return null;
  }

  clearPendingPurchase();
  return value;
}
