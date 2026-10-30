"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, IceCreamCone } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { T } from "@/components/language-provider";
import { formatPhp } from "@/lib/money";
import {
  beginPurchase,
  consumePendingPurchase,
  type PurchaseMode,
} from "@/lib/pending-purchase";
import type { Product } from "@/types/database";

type Variant = { id: string; name: string; price_adjustment_cents: number };
type Addon = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
};

function publicImageUrl(path: string | null) {
  if (!path) return null;
  if (/^https:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base
    ? `${base}/storage/v1/object/public/menu/${path.split("/").map(encodeURIComponent).join("/")}`
    : null;
}

export function ProductDetail({
  product,
  variants,
  addons,
  basePath = "/menu",
  workspace = false,
}: {
  product: Product;
  variants: Variant[];
  addons: Addon[];
  basePath?: string;
  workspace?: boolean;
}) {
  const { add, isAuthenticated } = useCart();
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants.length === 0 ? "" : "");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const selectedVariant = variants.find((variant) => variant.id === variantId);
  const selectedAddons = addons.filter((addon) => addonIds.includes(addon.id));
  const unitPrice =
    product.price_cents +
    (selectedVariant?.price_adjustment_cents ?? 0) +
    selectedAddons.reduce((sum, addon) => sum + addon.price_cents, 0);
  const imageUrl = publicImageUrl(product.image_path);
  const productPath = `${basePath}/${product.slug}`;

  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = consumePendingPurchase(product.id, window.location.pathname);
    if (!pending) return;
    add(pending.line, pending.quantity);
    router.replace(pending.mode === "buy-now" ? "/checkout" : "/cart");
  }, [add, isAuthenticated, product.id, router]);

  function purchase(mode: PurchaseMode) {
    const line = {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      unitPriceCents: unitPrice,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      addons: selectedAddons.map((addon) => ({
        id: addon.id,
        name: addon.name,
        priceCents: addon.price_cents,
      })),
    };
    if (
      !beginPurchase({
        isAuthenticated,
        returnPath: productPath,
        productId: product.id,
        line,
        quantity,
        mode,
      })
    ) {
      return;
    }
    add(line, quantity);
    if (mode === "buy-now") router.push("/checkout");
    else setAdded(true);
  }

  return (
    <section
      className={
        workspace
          ? "customer-account-page customer-menu-detail"
          : "section container"
      }
    >
      <p className="breadcrumbs">
        <Link href={basePath}>
          <ArrowLeft size={15} aria-hidden="true" />{" "}
          <T en="Back to menu" fil="Bumalik sa menu" />
        </Link>
      </p>
      <div className="detail-layout">
        <div className="detail-photo">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 720px) 100vw, 55vw"
              unoptimized
            />
          ) : (
            <div className="image-placeholder">
              <IceCreamCone size={56} strokeWidth={1.4} aria-hidden="true" />
              <span>
                <T en="No photo provided" fil="Walang ibinigay na larawan" />
              </span>
            </div>
          )}
        </div>
        <div className="detail-panel">
          <span className="eyebrow">
            <T en="Menu item" fil="Item sa menu" />
          </span>
          <h1 className="detail-title">{product.name}</h1>
          <p className="lead">
            {product.description || (
              <T
                en="The shop has not added a description yet."
                fil="Wala pang inilalagay na deskripsyon ang tindahan."
              />
            )}
          </p>
          <p className="detail-price">
            {formatPhp(unitPrice)}{" "}
            <span>
              <T en="estimated each" fil="tinatayang bawat isa" />
            </span>
          </p>
          {!product.is_available && (
            <p className="form-notice">
              <T
                en="This item is currently unavailable."
                fil="Hindi available ang item na ito ngayon."
              />
            </p>
          )}
          {variants.length > 0 && (
            <fieldset className="option-fieldset">
              <legend className="field-label">
                <T en="Choose an option" fil="Pumili ng opsyon" />
              </legend>
              <div className="option-list">
                {variants.map((variant) => (
                  <label className="option-row" key={variant.id}>
                    <span>
                      <input
                        type="radio"
                        name="product_variant"
                        value={variant.id}
                        checked={variantId === variant.id}
                        onChange={() => setVariantId(variant.id)}
                      />{" "}
                      {variant.name}
                    </span>
                    <strong>
                      {variant.price_adjustment_cents >= 0 ? "+" : "−"}
                      {formatPhp(Math.abs(variant.price_adjustment_cents))}
                    </strong>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {addons.length > 0 && (
            <fieldset className="option-fieldset">
              <legend className="field-label">
                <T en="Add-ons" fil="Dagdag" />
              </legend>
              <div className="option-list">
                {addons.map((addon) => (
                  <label className="option-row" key={addon.id}>
                    <span>
                      <input
                        type="checkbox"
                        checked={addonIds.includes(addon.id)}
                        onChange={(event) =>
                          setAddonIds((current) =>
                            event.target.checked
                              ? [...current, addon.id]
                              : current.filter((id) => id !== addon.id),
                          )
                        }
                      />{" "}
                      {addon.name}
                      {addon.description && <small>{addon.description}</small>}
                    </span>
                    <strong>+{formatPhp(addon.price_cents)}</strong>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="field">
            <label htmlFor="quantity">
              <T en="Quantity" fil="Dami" />
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              max="20"
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  Math.max(1, Math.min(20, Number(event.target.value) || 1)),
                )
              }
            />
          </div>
          <div className="product-detail-actions">
            <button
              className="button button-secondary"
              type="button"
              disabled={
                !product.is_available ||
                (variants.length > 0 && !variantId) ||
                unitPrice < 0
              }
              onClick={() => purchase("add")}
            >
              <T
                en={added ? "Added" : "Add"}
                fil={added ? "Naidagdag" : "Idagdag"}
              />
            </button>
            <button
              className="button"
              type="button"
              disabled={
                !product.is_available ||
                (variants.length > 0 && !variantId) ||
                unitPrice < 0
              }
              onClick={() => purchase("buy-now")}
            >
              <T en="Buy now" fil="Bumili ngayon" />
            </button>
            <Link className="text-link" href="/cart">
              <T en="View cart" fil="Tingnan ang cart" />
            </Link>
          </div>
          <p className="field-help">
            <T
              en="Prices and availability are rechecked on the server at checkout."
              fil="Muling susuriin ng server ang presyo at availability sa checkout."
            />
          </p>
        </div>
      </div>
    </section>
  );
}
