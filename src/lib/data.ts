import { createOptionalClient } from "@/lib/supabase/server";
import type { Category, Product } from "@/types/database";

export type MenuData = {
  products: Product[];
  categories: Category[];
  productsWithOptions: string[];
  configured: boolean;
  failed: boolean;
};

// Menu data is display-only. Checkout validates current prices and availability in Postgres.
const MENU_CACHE_TTL_MS = 60_000;
let menuDataCache: { value: MenuData; expiresAt: number } | null = null;
let menuDataRequest: Promise<MenuData> | null = null;
let menuDataVersion = 0;

export function clearMenuDataCache() {
  menuDataVersion += 1;
  menuDataCache = null;
  menuDataRequest = null;
}

function describeQueryError(error: unknown) {
  if (!error) return null;
  if (typeof error !== "object") return { message: String(error) };

  const value = error as {
    code?: unknown;
    details?: unknown;
    hint?: unknown;
    message?: unknown;
  };
  const serialized = JSON.stringify(error);

  return {
    code: typeof value.code === "string" ? value.code : null,
    message:
      typeof value.message === "string"
        ? value.message
        : serialized && serialized !== "{}"
          ? serialized
          : "Supabase returned an error without details",
    details: typeof value.details === "string" ? value.details : null,
    hint: typeof value.hint === "string" ? value.hint : null,
  };
}

async function loadMenuData(): Promise<MenuData> {
  const supabase = await createOptionalClient();
  if (!supabase) return { products: [], categories: [], productsWithOptions: [], configured: false, failed: false };

  const [productsResult, categoriesResult, variantsResult, addonLinksResult] =
    await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("product_variants")
        .select("product_id")
        .eq("is_active", true),
      supabase.from("product_addon_assignments").select("product_id"),
    ]);

  if (
    productsResult.error ||
    categoriesResult.error ||
    variantsResult.error
  ) {
    if (process.env.NODE_ENV === "development") {
      const errors = {
        products: describeQueryError(productsResult.error),
        categories: describeQueryError(categoriesResult.error),
        variants: describeQueryError(variantsResult.error),
        addonLinks: describeQueryError(addonLinksResult.error),
      };
      console.error(`Public menu query failed: ${JSON.stringify(errors)}`);
    }
    return { products: [], categories: [], productsWithOptions: [], configured: true, failed: true };
  }

  const products = productsResult.data ?? [];
  const productIds = new Set(products.map((product) => product.id));
  if (productIds.size === 0) {
    return { products, categories: categoriesResult.data ?? [], productsWithOptions: [], configured: true, failed: false };
  }

  if (addonLinksResult.error && process.env.NODE_ENV === "development") {
    console.error("Public add-on assignments could not be loaded", addonLinksResult.error.message);
  }

  const productsWithOptions = new Set([
    ...(variantsResult.data ?? [])
      .filter((item) => productIds.has(item.product_id))
      .map((item) => item.product_id),
    ...(addonLinksResult.data ?? [])
      .filter((item) => productIds.has(item.product_id))
      .map((item) => item.product_id),
  ]);

  return {
    products,
    categories: categoriesResult.data ?? [],
    productsWithOptions: [...productsWithOptions],
    configured: true,
    failed: false,
  };
}

export async function getMenuData(): Promise<MenuData> {
  if (menuDataCache && menuDataCache.expiresAt > Date.now()) {
    return menuDataCache.value;
  }
  if (menuDataRequest) return menuDataRequest;

  const version = menuDataVersion;
  const request = loadMenuData();
  const sharedRequest = request.then((value) => {
    if (version === menuDataVersion && value.configured && !value.failed) {
      menuDataCache = {
        value,
        expiresAt: Date.now() + MENU_CACHE_TTL_MS,
      };
    }
    return value;
  }).finally(() => {
    if (menuDataVersion === version) menuDataRequest = null;
  });
  menuDataRequest = sharedRequest;

  return sharedRequest;
}

export function productCategoryName(product: Product, categories: Category[]) {
  return categories.find((category) => category.id === product.category_id)?.name ?? "";
}
