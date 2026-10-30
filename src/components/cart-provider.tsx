"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  variantId: string | null;
  variantName: string | null;
  addons: Array<{ id: string; name: string; priceCents: number }>;
};

type NewCartLine = Omit<CartLine, "key" | "quantity">;
type CartContextValue = {
  lines: CartLine[];
  count: number;
  totalCents: number;
  isAuthenticated: boolean;
  add: (line: NewCartLine, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "annies-cart-v1";
const emptyCart = "[]";
const subscribers = new Set<() => void>();
let memorySnapshot: string | null = null;

function isCartLine(line: unknown): line is CartLine {
  if (!line || typeof line !== "object") return false;
  const value = line as Record<string, unknown>;
  return (
    typeof value.key === "string" &&
    typeof value.productId === "string" &&
    typeof value.slug === "string" &&
    typeof value.name === "string" &&
    Number.isInteger(value.unitPriceCents) &&
    Number(value.unitPriceCents) >= 0 &&
    Number.isInteger(value.quantity) &&
    Number(value.quantity) >= 1 &&
    Number(value.quantity) <= 20 &&
    (value.variantId === null || typeof value.variantId === "string") &&
    (value.variantName === null || typeof value.variantName === "string") &&
    Array.isArray(value.addons) &&
    value.addons.every((addon: unknown) => {
      if (!addon || typeof addon !== "object") return false;
      const item = addon as Record<string, unknown>;
      return (
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        Number.isInteger(item.priceCents) &&
        Number(item.priceCents) >= 0
      );
    })
  );
}

function parseCart(snapshot: string): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return Array.isArray(parsed) ? parsed.filter(isCartLine) : [];
  } catch {
    return [];
  }
}

function getSnapshot() {
  if (memorySnapshot !== null) return memorySnapshot;
  try {
    return window.localStorage.getItem(storageKey) ?? emptyCart;
  } catch {
    return emptyCart;
  }
}

function getServerSnapshot() {
  return emptyCart;
}

function emitChange() {
  subscribers.forEach((listener) => listener());
}

function handleStorage(event: StorageEvent) {
  if (event.key === storageKey || event.key === null) {
    memorySnapshot = null;
    emitChange();
  }
}

function subscribe(listener: () => void) {
  subscribers.add(listener);
  if (subscribers.size === 1) window.addEventListener("storage", handleStorage);
  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0)
      window.removeEventListener("storage", handleStorage);
  };
}

function writeCart(lines: CartLine[]) {
  memorySnapshot = JSON.stringify(lines);
  try {
    window.localStorage.setItem(storageKey, memorySnapshot);
  } catch {
    /* Keep the current cart in memory if storage is blocked. */
  }
  emitChange();
}

function currentLines() {
  return parseCart(getSnapshot());
}

export function CartProvider({
  children,
  isAuthenticated,
}: {
  children: ReactNode;
  isAuthenticated: boolean;
}) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const lines = useMemo(() => parseCart(snapshot), [snapshot]);

  const add = useCallback((item: NewCartLine, quantity = 1) => {
    const safeQuantity = Number.isFinite(quantity)
      ? Math.max(1, Math.min(20, Math.trunc(quantity)))
      : 1;
    const key = [
      item.productId,
      item.variantId ?? "",
      ...item.addons.map((addon) => addon.id).sort(),
    ].join(":");
    const current = currentLines();
    const existing = current.find((line) => line.key === key);
    writeCart(
      existing
        ? current.map((line) =>
            line.key === key
              ? {
                  ...line,
                  quantity: Math.min(20, line.quantity + safeQuantity),
                }
              : line,
          )
        : [...current, { ...item, key, quantity: safeQuantity }],
    );
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    const current = currentLines();
    writeCart(
      !Number.isFinite(quantity) || quantity < 1
        ? current.filter((line) => line.key !== key)
        : current.map((line) =>
            line.key === key
              ? { ...line, quantity: Math.min(20, Math.trunc(quantity)) }
              : line,
          ),
    );
  }, []);

  const remove = useCallback(
    (key: string) =>
      writeCart(currentLines().filter((line) => line.key !== key)),
    [],
  );
  const clear = useCallback(() => writeCart([]), []);
  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      isAuthenticated,
      totalCents: lines.reduce(
        (sum, line) => sum + line.unitPriceCents * line.quantity,
        0,
      ),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [add, clear, isAuthenticated, lines, remove, setQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider.");
  return value;
}
